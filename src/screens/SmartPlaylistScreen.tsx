import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useActiveTrack, usePlaybackState, State } from 'react-native-track-player';
import { theme, screenStyles } from '../theme';
import { getFavorites, getMostPlayed, toggleFavorite } from '../db/songsRepository';
import { SongRow } from '../components/SongRow';
import { playSongs } from '../playback/queue';
import { useRootNavigation } from '../navigation/hooks';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { Song } from '../db/types';

interface Props {
  route: RouteProp<RootStackParamList, 'SmartPlaylist'>;
}

const LABELS: Record<string, { title: string; icon: keyof typeof Ionicons.glyphMap; empty: string }> = {
  favorites: { title: 'Favoritas', icon: 'heart', empty: 'Marcá canciones como favoritas para verlas acá.' },
  mostPlayed: { title: 'Más reproducidas', icon: 'trending-up', empty: 'Todavía no reprodujiste suficiente música.' },
};

export function SmartPlaylistScreen({ route }: Props) {
  const { kind } = route.params;
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const [songs, setSongs] = useState<Song[]>([]);
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();
  const meta = LABELS[kind];

  const reload = useCallback(async () => {
    setSongs(kind === 'favorites' ? await getFavorites(db) : await getMostPlayed(db, 50));
  }, [db, kind]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function handlePlay(index: number) {
    await playSongs(songs, index);
    navigation.navigate('Player');
  }

  async function handleToggleFavorite(song: Song) {
    await toggleFavorite(db, song.id);
    await reload();
  }

  return (
    <View style={screenStyles.screen}>
      <View style={styles.header}>
        <Text style={screenStyles.title}>{meta.title}</Text>
        <Text style={screenStyles.subtitle}>
          {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
        </Text>
        {songs.length > 0 && (
          <Pressable style={styles.actionButton} onPress={() => handlePlay(0)}>
            <Ionicons name="play" size={16} color={theme.colors.darkOnBright} />
            <Text style={styles.actionButtonText}>Reproducir</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={songs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: theme.spacing.huge }}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            isActive={activeTrack?.id === String(item.id)}
            isPlaying={activeTrack?.id === String(item.id) && playback.state === State.Playing}
            onPress={() => handlePlay(index)}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={meta.icon} size={32} color={theme.colors.accent} style={{ marginBottom: theme.spacing.medium }} />
            <Text style={screenStyles.subtitle}>{meta.empty}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.large,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.small,
    marginTop: theme.spacing.medium,
  },
  actionButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '700',
  },
  emptyState: {
    padding: theme.spacing.huge,
    alignItems: 'center',
  },
});
