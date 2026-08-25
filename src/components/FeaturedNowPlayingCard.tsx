import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import TrackPlayer, { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { theme } from '../theme';
import { fallbackArtworkPalette } from '../theme/artworkPalette';
import { ArtworkView } from './ArtworkView';
import { PressableScale } from './PressableScale';
import { fadeScaleEntering, fadeScaleExiting } from '../utils/animations';
import { playSongs } from '../playback/queue';
import type { Song } from '../db/types';

const COVER_SIZE = 112;

interface FeaturedNowPlayingCardProps {
  fallbackSong: Song | null;
  fallbackLabel: string;
  onPress: () => void;
}

/** Home's hero card -- mirrors android-source's FeaturedNowPlayingCard: the
 * currently playing track if there is one, else the most relevant fallback
 * (continue-listening/most-recent), gradient-tinted by the track's palette,
 * crossfading (fade+scale) whenever the featured track's identity changes. */
export function FeaturedNowPlayingCard({ fallbackSong, fallbackLabel, onPress }: FeaturedNowPlayingCardProps) {
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const isPlaying = playback.state === State.Playing;

  const title = track?.title ?? fallbackSong?.title;
  const artist = track?.artist ?? fallbackSong?.artist;
  const artwork = (track?.artwork as string | undefined) ?? fallbackSong?.coverUri ?? undefined;
  const featuredKey = track ? `track-${track.id}` : fallbackSong ? `song-${fallbackSong.id}` : 'empty';

  if (!title) return null;

  const palette = fallbackArtworkPalette(`${title}|${artist ?? ''}`);
  const label = track ? (isPlaying ? 'Reproduciendo ahora' : 'En pausa') : fallbackLabel;

  async function handlePlayPause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (track) {
      isPlaying ? await TrackPlayer.pause() : await TrackPlayer.play();
    } else if (fallbackSong) {
      await playSongs([fallbackSong], 0);
    }
  }

  return (
    <Animated.View key={featuredKey} entering={fadeScaleEntering(theme.motion.standard)} exiting={fadeScaleExiting(theme.motion.quick)}>
      <PressableScale style={styles.card} onPress={onPress} haptic>
        <LinearGradient
          colors={[palette.dominant, palette.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <ArtworkView uri={artwork} seed={`${title}|${artist ?? ''}`} size={COVER_SIZE} radius={theme.radii.large} />
          <View style={styles.textBlock}>
            <Text style={[styles.label, { color: palette.accent }]}>{label.toUpperCase()}</Text>
            <Text style={[styles.title, { color: palette.onBackground }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.subtitle, { color: palette.onBackground }]} numberOfLines={1}>
              {artist || 'Artista desconocido'}
            </Text>
          </View>
          <PressableScale
            style={[styles.playButton, { backgroundColor: palette.accent }]}
            onPress={handlePlayPause}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={palette.onAccent} />
          </PressableScale>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.radii.hero,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    padding: theme.spacing.large,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xxs,
    opacity: theme.opacity.secondary,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    opacity: theme.opacity.secondary,
    marginTop: 2,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
