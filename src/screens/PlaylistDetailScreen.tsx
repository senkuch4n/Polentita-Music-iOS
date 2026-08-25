import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { theme, screenStyles } from '../theme';
import {
  addSongsToPlaylist,
  deletePlaylist,
  getPlaylistById,
  getPlaylistSongs,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  updatePlaylistCover,
  updatePlaylistDetails,
} from '../db/playlistsRepository';
import { getAllSongs } from '../db/songsRepository';
import { SongRow } from '../components/SongRow';
import { ArtworkView } from '../components/ArtworkView';
import { PressableScale } from '../components/PressableScale';
import { DraggableSongList } from '../components/DraggableSongList';
import { fallbackArtworkPalette } from '../theme/artworkPalette';
import { coversDirectory, ensureLibraryDirectories } from '../library/paths';
import { playSongs } from '../playback/queue';
import { shuffleArray } from '../utils/array';
import { useRootNavigation } from '../navigation/hooks';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { Song } from '../db/types';

interface Props {
  route: RouteProp<RootStackParamList, 'PlaylistDetail'>;
}

const HERO_HEIGHT = 320;
const COLLAPSE_DISTANCE = 200;

export function PlaylistDetailScreen({ route }: Props) {
  const { playlistId, playlistName: initialName } = route.params;
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const [playlistName, setPlaylistName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const scrollY = useSharedValue(0);

  const reload = useCallback(async () => {
    const playlist = await getPlaylistById(db, playlistId);
    if (playlist) {
      setPlaylistName(playlist.name);
      setDescription(playlist.description);
      setCoverUri(playlist.coverUri);
    }
    setSongs(await getPlaylistSongs(db, playlistId));
  }, [db, playlistId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, -40], Extrapolation.CLAMP) }],
  }));
  const compactBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_DISTANCE * 0.7, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  const palette = fallbackArtworkPalette(playlistName);

  async function handlePlay(index: number) {
    await playSongs(songs, index);
    navigation.navigate('Player');
  }

  async function handleShuffle() {
    if (songs.length === 0) return;
    await playSongs(shuffleArray(songs), 0);
    navigation.navigate('Player');
  }

  async function handleRemove(song: Song) {
    await removeSongFromPlaylist(db, playlistId, song.id);
    await reload();
  }

  async function handleReorder(newOrder: Song[]) {
    setSongs(newOrder);
    await reorderPlaylistSongs(db, playlistId, newOrder.map((s) => s.id));
  }

  function handleRename() {
    Alert.prompt(
      'Nombre de la lista',
      undefined,
      (name) => {
        if (!name?.trim()) return;
        Alert.prompt(
          'Descripción',
          'Opcional',
          async (desc) => {
            await updatePlaylistDetails(db, playlistId, { name: name.trim(), description: desc?.trim() ?? '' });
            await reload();
          },
          'plain-text',
          description,
        );
      },
      'plain-text',
      playlistName,
    );
  }

  async function handleChangeCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Sin permiso', 'Habilitá el acceso a Fotos para elegir una portada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    ensureLibraryDirectories();
    const source = new File(result.assets[0].uri);
    const destination = new File(coversDirectory, `playlist_${playlistId}_${Date.now()}.jpg`);
    source.copy(destination);
    await updatePlaylistCover(db, playlistId, destination.uri);
    await reload();
  }

  function openEditMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Editar nombre y descripción', 'Cambiar portada', 'Cancelar'], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) handleRename();
        if (index === 1) handleChangeCover();
      },
    );
  }

  function handleDelete() {
    Alert.alert('Eliminar lista', `¿Eliminar "${playlistName}"? Las canciones no se borran del dispositivo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deletePlaylist(db, playlistId);
          navigation.goBack();
        },
      },
    ]);
  }

  async function openAddSongs() {
    setAllSongs(await getAllSongs(db));
    setSelectedIds(new Set());
    setAdding(true);
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmAddSongs() {
    await addSongsToPlaylist(db, playlistId, Array.from(selectedIds));
    setAdding(false);
    await reload();
  }

  if (adding) {
    return (
      <View style={screenStyles.screen}>
        <View style={styles.addHeader}>
          <Pressable onPress={() => setAdding(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Text style={styles.addTitle}>Agregar canciones</Text>
          <Pressable onPress={confirmAddSongs} disabled={selectedIds.size === 0}>
            <Text style={[styles.doneText, selectedIds.size === 0 && styles.doneTextDisabled]}>
              Listo ({selectedIds.size})
            </Text>
          </Pressable>
        </View>
        <FlatList
          data={allSongs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.pickerRow} onPress={() => toggleSelected(item.id)}>
              <ArtworkView uri={item.coverUri} seed={`${item.title}|${item.artist}`} size={44} radius={theme.radii.small} />
              <Text style={styles.pickerRowText} numberOfLines={1}>{item.title}</Text>
              <Ionicons
                name={selectedIds.has(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selectedIds.has(item.id) ? theme.colors.accent : theme.colors.secondaryOnDark}
              />
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View style={screenStyles.screen}>
      <Animated.View style={[styles.compactBar, compactBarStyle]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primaryOnDark} />
        </Pressable>
        <ArtworkView uri={coverUri} seed={playlistName} size={36} radius={theme.radii.small} />
        <Text style={styles.compactTitle} numberOfLines={1}>{playlistName}</Text>
        <PressableScale style={[styles.compactPlayButton, { backgroundColor: palette.accent }]} onPress={() => handlePlay(0)} haptic>
          <Ionicons name="play" size={16} color={palette.onAccent} />
        </PressableScale>
      </Animated.View>

      <Pressable style={styles.floatingBack} onPress={() => navigation.goBack()} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.primaryOnDark} />
      </Pressable>

      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: theme.spacing.huge }}>
        <Animated.View style={heroStyle}>
          <View style={styles.hero}>
            <ArtworkView uri={coverUri} seed={playlistName} size={200} radius={theme.radii.hero} />
            <LinearGradient colors={['transparent', palette.background]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={styles.heroTitle} numberOfLines={2}>{playlistName}</Text>
            {description ? <Text style={styles.heroDescription} numberOfLines={2}>{description}</Text> : null}
            <Text style={styles.heroMeta}>{songs.length} {songs.length === 1 ? 'canción' : 'canciones'}</Text>

            <View style={styles.actionsRow}>
              <PressableScale style={[styles.playButton, { backgroundColor: palette.accent }]} onPress={() => handlePlay(0)} disabled={songs.length === 0} haptic>
                <Ionicons name="play" size={16} color={palette.onAccent} />
                <Text style={[styles.playButtonText, { color: palette.onAccent }]}>Reproducir</Text>
              </PressableScale>
              <PressableScale style={styles.iconButton} onPress={handleShuffle} disabled={songs.length === 0} haptic>
                <Ionicons name="shuffle" size={18} color={theme.colors.primaryOnDark} />
              </PressableScale>
              <PressableScale style={styles.iconButton} onPress={openAddSongs} haptic>
                <Ionicons name="add" size={20} color={theme.colors.primaryOnDark} />
              </PressableScale>
              <PressableScale style={styles.iconButton} onPress={openEditMenu} haptic>
                <Ionicons name="pencil" size={18} color={theme.colors.primaryOnDark} />
              </PressableScale>
              <PressableScale style={styles.iconButton} onPress={handleDelete} haptic>
                <Ionicons name="trash" size={18} color="#E5766D" />
              </PressableScale>
            </View>
          </View>
        </Animated.View>

        {songs.length > 0 && (
          <Pressable style={styles.reorderLink} onPress={() => setReordering((v) => !v)}>
            <Ionicons name={reordering ? 'checkmark' : 'reorder-three-outline'} size={16} color={theme.colors.accent} />
            <Text style={styles.reorderLinkText}>{reordering ? 'Listo' : 'Reordenar'}</Text>
          </Pressable>
        )}

        {reordering ? (
          <DraggableSongList songs={songs} onReorder={handleReorder} />
        ) : songs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={screenStyles.subtitle}>Agregá canciones con el botón +.</Text>
          </View>
        ) : (
          songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              onPress={() => handlePlay(index)}
              swipeAction={{ label: 'Quitar', icon: 'remove-circle-outline', color: '#C0433E', onPress: () => handleRemove(song) }}
            />
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  compactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    paddingTop: 56,
    paddingBottom: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  compactTitle: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    fontWeight: '700',
  },
  compactPlayButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBack: {
    position: 'absolute',
    top: 56,
    left: theme.spacing.large,
    zIndex: 11,
    width: 36,
    height: 36,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    paddingTop: 88,
    paddingHorizontal: theme.spacing.large,
    gap: theme.spacing.xs,
  },
  heroTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.medium,
  },
  heroDescription: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    textAlign: 'center',
  },
  heroMeta: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    marginTop: theme.spacing.medium,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.small,
  },
  playButtonText: {
    fontWeight: '700',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.small,
  },
  reorderLinkText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: theme.spacing.huge,
    alignItems: 'center',
  },
  addHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.large,
  },
  addTitle: {
    color: theme.colors.primaryOnDark,
    fontWeight: '700',
    fontSize: 16,
  },
  cancelText: {
    color: theme.colors.secondaryOnDark,
  },
  doneText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  doneTextDisabled: {
    opacity: 0.4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.small,
  },
  pickerRowText: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 15,
  },
});
