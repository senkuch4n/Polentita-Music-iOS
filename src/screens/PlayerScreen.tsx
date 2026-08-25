import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import { theme } from '../theme';
import { formatDuration } from '../utils/format';
import { useRootNavigation } from '../navigation/hooks';

export function PlayerScreen() {
  const navigation = useRootNavigation();
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const progress = useProgress(250);

  const isPlaying = playback.state === State.Playing;

  async function togglePlayPause() {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Cerrar</Text>
      </Pressable>

      <View style={styles.artworkWrap}>
        {track?.artwork ? (
          <Image source={{ uri: track.artwork as string }} style={styles.artwork} contentFit="cover" />
        ) : (
          <View style={[styles.artwork, styles.artworkFallback]} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {track?.title ?? 'Nada reproduciéndose'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track?.artist ?? ''}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(progress.duration, 0.1)}
          value={progress.position}
          minimumTrackTintColor={theme.colors.accent}
          maximumTrackTintColor={theme.colors.surfaceRaised}
          thumbTintColor={theme.colors.accent}
          onSlidingComplete={(value) => TrackPlayer.seekTo(value)}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatDuration(progress.position * 1000)}</Text>
          <Text style={styles.time}>{formatDuration(progress.duration * 1000)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => TrackPlayer.skipToPrevious()}>
          <Text style={styles.controlIcon}>⏮</Text>
        </Pressable>
        <Pressable style={styles.playButton} onPress={togglePlayPause}>
          <Text style={styles.playButtonIcon}>{isPlaying ? '⏸' : '▶︎'}</Text>
        </Pressable>
        <Pressable onPress={() => TrackPlayer.skipToNext()}>
          <Text style={styles.controlIcon}>⏭</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  closeButtonText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 15,
  },
  artworkWrap: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  artwork: {
    width: theme.coverSize.hero,
    height: theme.coverSize.hero,
    borderRadius: theme.radii.hero,
  },
  artworkFallback: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  info: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 20,
    fontWeight: '700',
  },
  artist: {
    color: theme.colors.secondaryOnDark,
    fontSize: 15,
    marginTop: theme.spacing.xs,
  },
  progressWrap: {
    marginTop: theme.spacing.xxl,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  controlIcon: {
    fontSize: 28,
    color: theme.colors.primaryOnDark,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonIcon: {
    fontSize: 28,
    color: theme.colors.darkOnBright,
  },
});
