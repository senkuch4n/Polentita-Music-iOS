import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, screenStyles } from '../theme';
import { createPlaylist, getAllPlaylists, type PlaylistWithCount } from '../db/playlistsRepository';
import { ArtworkView } from '../components/ArtworkView';
import { PressableScale } from '../components/PressableScale';
import { useRootNavigation } from '../navigation/hooks';

const SMART_PLAYLISTS: { kind: 'favorites' | 'mostPlayed'; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'favorites', name: 'Favoritas', icon: 'heart' },
  { kind: 'mostPlayed', name: 'Más reproducidas', icon: 'trending-up' },
];

export function PlaylistsScreen() {
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const [playlists, setPlaylists] = useState<PlaylistWithCount[]>([]);

  const reload = useCallback(async () => {
    setPlaylists(await getAllPlaylists(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  function handleCreate() {
    Alert.prompt(
      'Nueva lista',
      'Ponele un nombre a tu lista',
      (name) => {
        if (!name?.trim()) return;
        Alert.prompt(
          'Descripción',
          'Opcional',
          async (description) => {
            const playlist = await createPlaylist(db, name.trim(), description?.trim() ?? '');
            await reload();
            navigation.navigate('PlaylistDetail', { playlistId: playlist.id, playlistName: playlist.name });
          },
          'plain-text',
        );
      },
      'plain-text',
    );
  }

  return (
    <View style={screenStyles.screen}>
      <View style={styles.header}>
        <Text style={screenStyles.title}>Listas</Text>
        <PressableScale style={styles.newButton} onPress={handleCreate} haptic>
          <Ionicons name="add" size={18} color={theme.colors.darkOnBright} />
          <Text style={styles.newButtonText}>Nueva lista</Text>
        </PressableScale>
      </View>
      <FlatList
        data={playlists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: theme.spacing.huge }}
        ListHeaderComponent={
          <View style={styles.smartRow}>
            {SMART_PLAYLISTS.map((item) => (
              <PressableScale
                key={item.kind}
                style={styles.smartCard}
                onPress={() => navigation.navigate('SmartPlaylist', { kind: item.kind })}
                haptic
              >
                <Ionicons name={item.icon} size={22} color={theme.colors.accent} />
                <Text style={styles.smartCardText}>{item.name}</Text>
              </PressableScale>
            ))}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(theme.motion.standard)}>
            <PressableScale
              style={styles.row}
              onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, playlistName: item.name })}
              haptic
            >
              <ArtworkView uri={item.coverUri} seed={item.name} size={theme.coverSize.row} radius={theme.radii.medium} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>
                  {item.songCount} {item.songCount === 1 ? 'canción' : 'canciones'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.secondaryOnDark} />
            </PressableScale>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={screenStyles.subtitle}>Todavía no creaste ninguna lista.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.large,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.xs,
  },
  newButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '700',
    fontSize: 13,
  },
  smartRow: {
    flexDirection: 'row',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    paddingBottom: theme.spacing.large,
  },
  smartCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    backgroundColor: theme.colors.accent + '14',
    borderRadius: theme.radii.medium,
    padding: theme.spacing.medium,
  },
  smartCardText: {
    color: theme.colors.primaryOnDark,
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.small,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    padding: theme.spacing.huge,
    alignItems: 'center',
  },
});
