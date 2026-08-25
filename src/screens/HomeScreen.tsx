import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useActiveTrack } from 'react-native-track-player';
import { theme, screenStyles } from '../theme';
import { useHome } from '../hooks/useHome';
import { useAllSongs } from '../hooks/useSongs';
import { playSongs } from '../playback/queue';
import { useRootNavigation } from '../navigation/hooks';
import { shuffleArray } from '../utils/array';
import { CollapsingHomeHeader } from '../components/CollapsingHomeHeader';
import { FeaturedNowPlayingCard } from '../components/FeaturedNowPlayingCard';
import { HorizontalShelf } from '../components/HorizontalShelf';
import { SongVerticalCard, SongCompactCard, AlbumStackCard, PlaylistShelfCard, QuickActionPill } from '../components/HomeCards';
import { MostPlayedRanking } from '../components/MostPlayedRanking';
import { DinoRunnerGame } from '../components/DinoRunnerGame';
import type { Song } from '../db/types';

export function HomeScreen() {
  const { recentlyAdded, continueListening, favorites, mostPlayed, recentAlbums, playlists, loading } = useHome();
  const { songs: allSongs } = useAllSongs();
  const navigation = useRootNavigation();
  const activeTrack = useActiveTrack();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  async function handlePlay(list: Song[], song: Song) {
    const index = list.findIndex((s) => s.id === song.id);
    await playSongs(list, Math.max(0, index));
    navigation.navigate('Player');
  }

  async function handleShuffle() {
    if (allSongs.length === 0) return;
    await playSongs(shuffleArray(allSongs), 0);
    navigation.navigate('Player');
  }

  const fallbackSong = continueListening[0] ?? recentlyAdded[0] ?? null;
  const fallbackLabel = continueListening[0] ? 'Seguí escuchando' : 'Recién agregada';

  const isEmpty =
    !loading &&
    !activeTrack &&
    recentlyAdded.length === 0 &&
    favorites.length === 0 &&
    recentAlbums.length === 0 &&
    playlists.length === 0 &&
    mostPlayed.length === 0;

  return (
    <View style={screenStyles.screen}>
      <CollapsingHomeHeader scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: theme.spacing.huge }}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="musical-notes" size={32} color={theme.colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Tu biblioteca está vacía</Text>
            <Text style={screenStyles.subtitle}>Importá o descargá música para verla acá.</Text>
          </View>
        ) : (
          <>
            {(fallbackSong || activeTrack) && (
              <FeaturedNowPlayingCard
                fallbackSong={fallbackSong}
                fallbackLabel={fallbackLabel}
                onPress={async () => {
                  if (!activeTrack && fallbackSong) {
                    await playSongs([fallbackSong], 0);
                  }
                  navigation.navigate('Player');
                }}
              />
            )}

            <View style={styles.quickActions}>
              <QuickActionPill icon="shuffle" label="Aleatorio" onPress={handleShuffle} primary />
              <QuickActionPill icon="heart" label="Favoritos" onPress={() => navigation.navigate('SmartPlaylist', { kind: 'favorites' })} />
              <QuickActionPill icon="arrow-down-circle" label="Descargas" onPress={() => navigation.navigate('DownloadsNew')} />
              <QuickActionPill icon="library" label="Biblioteca" onPress={() => navigation.navigate('Tabs', { screen: 'Library' })} />
            </View>

            <HorizontalShelf
              title="Seguir escuchando"
              data={continueListening}
              keyExtractor={(song) => String(song.id)}
              renderItem={(song) => <SongVerticalCard song={song} onPress={() => handlePlay(continueListening, song)} />}
            />

            <HorizontalShelf
              title="Agregadas recientemente"
              data={recentlyAdded}
              keyExtractor={(song) => String(song.id)}
              renderItem={(song) => <SongCompactCard song={song} onPress={() => handlePlay(recentlyAdded, song)} />}
              onSeeAll={() => navigation.navigate('Tabs', { screen: 'Library' })}
            />

            <HorizontalShelf
              title="Favoritos"
              data={favorites}
              keyExtractor={(song) => String(song.id)}
              renderItem={(song) => <SongVerticalCard song={song} onPress={() => handlePlay(favorites, song)} showFavoriteBadge />}
              onSeeAll={() => navigation.navigate('SmartPlaylist', { kind: 'favorites' })}
            />

            <HorizontalShelf
              title="Álbumes recientes"
              data={recentAlbums}
              keyExtractor={(album) => String(album.id)}
              renderItem={(album) => (
                <AlbumStackCard album={album} onPress={() => navigation.navigate('AlbumDetail', { albumId: String(album.id) })} />
              )}
            />

            <HorizontalShelf
              title="Listas"
              data={playlists}
              keyExtractor={(playlist) => String(playlist.id)}
              renderItem={(playlist) => (
                <PlaylistShelfCard
                  playlist={playlist}
                  onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id, playlistName: playlist.name })}
                />
              )}
              onSeeAll={() => navigation.navigate('Tabs', { screen: 'Playlists' })}
            />

            <MostPlayedRanking
              songs={mostPlayed}
              onPress={(song) => handlePlay(mostPlayed, song)}
              onSeeAll={() => navigation.navigate('SmartPlaylist', { kind: 'mostPlayed' })}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Un ratito de pausa</Text>
        <DinoRunnerGame />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.huge,
    marginTop: theme.spacing.huge,
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
