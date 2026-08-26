import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useActiveTrack, usePlaybackState, State } from 'react-native-track-player';
import { theme, screenStyles } from '../theme';
import { useLibrary, type SortDirection } from '../hooks/useLibrary';
import { importPickedFiles } from '../library/importFiles';
import { loadDevSeedAsset } from '../library/devSeed';
import { playSongs, playNext } from '../playback/queue';
import { deleteSong, toggleFavorite, type SongSortBy } from '../db/songsRepository';
import { getLibraryViewMode, setLibraryViewMode, type LibraryViewMode } from '../storage/preferences';
import { useRootNavigation } from '../navigation/hooks';
import { SongRow } from '../components/SongRow';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { SongGridCard, AlbumGridCard, ArtistGridCard, ArtistRow } from '../components/LibraryCards';
import { previewAudio } from '../native/pythonBridge';
import type { Song } from '../db/types';
import type { AlbumWithCount } from '../db/albumsRepository';
import type { ArtistSummary } from '../db/artistsRepository';

type Tab = 'songs' | 'albums' | 'artists';

const SORT_LABELS: Record<SongSortBy, string> = {
  title: 'Título',
  artist: 'Artista',
  album: 'Álbum',
  dateAdded: 'Fecha agregada',
  dateModified: 'Fecha modificada',
  duration: 'Duración',
  playCount: 'N° de reproducciones',
  lastPlayedAt: 'Última reproducción',
};
const SORT_ORDER: SongSortBy[] = ['title', 'artist', 'album', 'dateAdded', 'dateModified', 'duration', 'playCount', 'lastPlayedAt'];

const GRID_COLUMNS = 3;
const GRID_GAP = theme.spacing.medium;

export function LibraryScreen() {
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();
  const { width } = useWindowDimensions();

  const [tab, setTab] = useState<Tab>('songs');
  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => getLibraryViewMode());
  const [sortBy, setSortBy] = useState<SongSortBy>('title');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const { songs, albums, artists, loading, reload } = useLibrary(sortBy, direction, search);

  const gridSize = (width - theme.spacing.large * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  function changeViewMode(mode: LibraryViewMode) {
    setViewMode(mode);
    setLibraryViewMode(mode);
  }

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    setImporting(true);
    try {
      const outcome = await importPickedFiles(db, result.assets);
      await reload();
      const parts = [`${outcome.imported.length} agregada(s)`];
      if (outcome.duplicates) parts.push(`${outcome.duplicates} ya existían`);
      if (outcome.failed.length) parts.push(`${outcome.failed.length} fallaron`);
      Alert.alert('Importación', parts.join(' · '));
    } finally {
      setImporting(false);
    }
  }

  async function handleDevSeed() {
    setImporting(true);
    try {
      const asset = await loadDevSeedAsset();
      const outcome = await importPickedFiles(db, [asset]);
      await reload();
      if (outcome.failed.length) Alert.alert('Canción de prueba', outcome.failed[0].error);
    } finally {
      setImporting(false);
    }
  }

  async function handleTestPythonBridge() {
    const t0 = Date.now();
    console.log('[pythonBridgeTest] calling previewAudio...');
    try {
      const media = await previewAudio('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      console.log('[pythonBridgeTest] OK', ((Date.now() - t0) / 1000).toFixed(1) + 's', media.title, media.artist);
      Alert.alert('PythonBridge OK', `${((Date.now() - t0) / 1000).toFixed(1)}s\n${media.title}\n${media.artist ?? ''}`);
    } catch (e: any) {
      console.log('[pythonBridgeTest] FAILED', ((Date.now() - t0) / 1000).toFixed(1) + 's', e?.message ?? String(e));
      Alert.alert('PythonBridge FAILED', `${((Date.now() - t0) / 1000).toFixed(1)}s\n${e?.message ?? String(e)}`);
    }
  }

  function openSortSheet() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...SORT_ORDER.map((key) => SORT_LABELS[key]), 'Cancelar'], cancelButtonIndex: SORT_ORDER.length },
      (index) => {
        if (index < SORT_ORDER.length) setSortBy(SORT_ORDER[index]);
      },
    );
  }

  async function handlePlaySong(song: Song, index: number) {
    await playSongs(songs, index);
    navigation.navigate('Player');
  }

  async function handleToggleFavorite(song: Song) {
    await toggleFavorite(db, song.id);
    await reload();
  }

  function handleDeleteSong(song: Song) {
    Alert.alert('Eliminar canción', `¿Qué querés hacer con "${song.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar de biblioteca',
        onPress: async () => {
          await deleteSong(db, song.id);
          await reload();
        },
      },
      {
        text: 'Eliminar también el archivo',
        style: 'destructive',
        onPress: async () => {
          await deleteSong(db, song.id);
          const file = new File(song.contentUri);
          if (file.exists) file.delete();
          await reload();
        },
      },
    ]);
  }

  const showViewToggle = tab !== 'albums';
  const count = tab === 'songs' ? songs.length : tab === 'albums' ? albums.length : artists.length;

  return (
    <View style={screenStyles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.importButton} onPress={handleImport} disabled={importing}>
          {importing ? (
            <ActivityIndicator color={theme.colors.darkOnBright} />
          ) : (
            <>
              <Ionicons name="add-circle" size={18} color={theme.colors.darkOnBright} />
              <Text style={styles.importButtonText}>Importar música</Text>
            </>
          )}
        </Pressable>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={theme.colors.secondaryOnDark} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar en tu biblioteca…"
              placeholderTextColor={theme.colors.secondaryOnDark}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable hitSlop={8} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.secondaryOnDark} />
              </Pressable>
            )}
          </View>
          <Pressable hitSlop={8} style={styles.iconButton} onPress={() => navigation.navigate('DownloadsNew')}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={theme.colors.secondaryOnDark} />
          </Pressable>
        </View>

        <SegmentedTabs
          tabs={[
            { key: 'songs' as Tab, label: 'Canciones' },
            { key: 'albums' as Tab, label: 'Álbumes' },
            { key: 'artists' as Tab, label: 'Artistas' },
          ]}
          active={tab}
          onChange={setTab}
        />

        <View style={styles.summaryRow}>
          <Text style={styles.count}>
            {count} {count === 1 ? 'elemento' : 'elementos'}
          </Text>
          <View style={styles.summaryActions}>
            {tab === 'songs' && (
              <>
                <Pressable style={styles.sortChip} onPress={openSortSheet}>
                  <Text style={styles.sortChipText}>{SORT_LABELS[sortBy]}</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}>
                  <Ionicons name={direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={18} color={theme.colors.secondaryOnDark} />
                </Pressable>
              </>
            )}
            {showViewToggle && (
              <Pressable hitSlop={8} onPress={() => changeViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={20} color={theme.colors.secondaryOnDark} />
              </Pressable>
            )}
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.devRow}>
            <Pressable style={styles.devButton} onPress={handleDevSeed} disabled={importing}>
              <Text style={styles.devButtonText}>+ Canción de prueba (dev)</Text>
            </Pressable>
            <Pressable style={styles.devButton} onPress={handleTestPythonBridge}>
              <Text style={styles.devButtonText}>Probar PythonBridge (dev)</Text>
            </Pressable>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: theme.spacing.xxl }} color={theme.colors.accent} />
      ) : count === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="musical-notes" size={32} color={theme.colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>{search ? 'Sin resultados' : 'Tu biblioteca está vacía'}</Text>
          <Text style={screenStyles.subtitle}>
            {search ? `No encontramos nada para "${search}".` : 'Tocá "Importar música" para elegir archivos de audio de tu iPhone.'}
          </Text>
        </View>
      ) : (
        <Animated.View key={`${tab}-${viewMode}`} entering={FadeIn.duration(theme.motion.quick)} style={{ flex: 1 }}>
          {tab === 'songs' &&
            (viewMode === 'list' ? (
              <FlatList
                data={songs}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: theme.spacing.huge }}
                renderItem={({ item, index }) => (
                  <SongRow
                    song={item}
                    isActive={activeTrack?.id === String(item.id)}
                    isPlaying={activeTrack?.id === String(item.id) && playback.state === State.Playing}
                    onPress={() => handlePlaySong(item, index)}
                    swipeAction={{ label: 'Siguiente', icon: 'albums-outline', onPress: () => playNext(item) }}
                    onToggleFavorite={() => handleToggleFavorite(item)}
                    onEdit={() => navigation.navigate('SongEditor', { songId: String(item.id) })}
                    onTechnicalInfo={() => navigation.navigate('Technical', { songId: String(item.id) })}
                    onDelete={() => handleDeleteSong(item)}
                  />
                )}
              />
            ) : (
              <FlatList
                data={songs}
                keyExtractor={(item) => String(item.id)}
                numColumns={GRID_COLUMNS}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.large, paddingBottom: theme.spacing.huge, gap: GRID_GAP }}
                columnWrapperStyle={{ gap: GRID_GAP }}
                renderItem={({ item, index }) => (
                  <SongGridCard
                    song={item}
                    size={gridSize}
                    isActive={activeTrack?.id === String(item.id)}
                    onPress={() => handlePlaySong(item, index)}
                  />
                )}
              />
            ))}

          {tab === 'albums' && (
            <FlatList
              data={albums}
              keyExtractor={(item: AlbumWithCount) => String(item.id)}
              numColumns={GRID_COLUMNS}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.large, paddingBottom: theme.spacing.huge, gap: GRID_GAP }}
              columnWrapperStyle={{ gap: GRID_GAP }}
              renderItem={({ item }) => (
                <AlbumGridCard album={item} size={gridSize} onPress={() => navigation.navigate('AlbumDetail', { albumId: String(item.id) })} />
              )}
            />
          )}

          {tab === 'artists' &&
            (viewMode === 'list' ? (
              <FlatList
                data={artists}
                keyExtractor={(item: ArtistSummary) => item.name}
                contentContainerStyle={{ paddingBottom: theme.spacing.huge }}
                renderItem={({ item }) => (
                  <ArtistRow artist={item} onPress={() => navigation.navigate('ArtistDetail', { artist: item.name })} />
                )}
              />
            ) : (
              <FlatList
                data={artists}
                keyExtractor={(item: ArtistSummary) => item.name}
                numColumns={GRID_COLUMNS}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.large, paddingBottom: theme.spacing.huge, gap: GRID_GAP }}
                columnWrapperStyle={{ gap: GRID_GAP }}
                renderItem={({ item }) => (
                  <ArtistGridCard artist={item} size={gridSize} onPress={() => navigation.navigate('ArtistDetail', { artist: item.name })} />
                )}
              />
            ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: theme.spacing.large,
    paddingBottom: theme.spacing.small,
    gap: theme.spacing.medium,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginHorizontal: theme.spacing.large,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.small,
  },
  importButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    marginHorizontal: theme.spacing.large,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radii.pill,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 15,
  },
  iconButton: {
    padding: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.large,
  },
  count: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
  },
  sortChip: {
    paddingHorizontal: theme.spacing.small,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceRaised,
  },
  sortChipText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: theme.spacing.large,
  },
  devButton: {
    alignItems: 'center',
  },
  devButtonText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.huge,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.large,
    backgroundColor: theme.colors.accent + '1F',
    borderWidth: 1,
    borderColor: theme.colors.accent + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.large,
  },
  emptyTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
});
