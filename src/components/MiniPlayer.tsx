import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TrackPlayer, { State, useActiveTrack, usePlaybackState, useProgress } from 'react-native-track-player';
import { ArtworkView } from './ArtworkView';
import { useRootNavigation } from '../navigation/hooks';
import { theme } from '../theme';
import { fallbackArtworkPalette } from '../theme/artworkPalette';

/** Floating glass card above the tab bar -- mirrors android-source's
 * MiniPlayer (artwork, title/artist, play/pause, thin progress bar), tinted
 * by the current track's artwork palette like the Android app's ambient
 * theming, using native iOS blur instead of a flat translucent surface. */
export function MiniPlayer() {
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const progress = useProgress(250);
  const navigation = useRootNavigation();

  if (!track) return null;

  const isPlaying = playback.state === State.Playing;
  const palette = fallbackArtworkPalette(`${track.title}|${track.artist}`);
  const progressPct = progress.duration > 0 ? progress.position / progress.duration : 0;

  async function togglePlayPause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => navigation.navigate('Player')}
      accessibilityRole="button"
      accessibilityLabel={`Reproduciendo ${track.title}`}
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.accent + '26' }]} />
        <View style={styles.content}>
          <ArtworkView uri={track.artwork as string | undefined} seed={`${track.title}|${track.artist}`} size={theme.coverSize.mini} radius={theme.radii.small} />
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {track.artist || 'Artista desconocido'}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={togglePlayPause} style={styles.playButton}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={theme.colors.primaryOnDark} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => TrackPlayer.skipToNext()} style={styles.playButton}>
            <Ionicons name="play-skip-forward" size={18} color={theme.colors.primaryOnDark} />
          </Pressable>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%`, backgroundColor: palette.accent }]} />
        </View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.small,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radii.large,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '22',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
    paddingVertical: theme.spacing.xs,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    marginTop: 1,
  },
  playButton: {
    padding: theme.spacing.xs,
  },
  progressTrack: {
    height: 2,
    backgroundColor: theme.colors.primaryOnDark + '1F',
  },
  progressFill: {
    height: 2,
  },
});
