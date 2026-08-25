import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
  RepeatMode,
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import { useEffect, useState } from 'react';
import { theme } from '../theme';
import { fallbackArtworkPalette } from '../theme/artworkPalette';
import { formatDuration } from '../utils/format';
import { useRootNavigation } from '../navigation/hooks';

export function PlayerScreen() {
  const navigation = useRootNavigation();
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const progress = useProgress(250);
  const [repeatMode, setRepeatMode] = useState(RepeatMode.Off);

  const isPlaying = playback.state === State.Playing;
  const palette = fallbackArtworkPalette(`${track?.title ?? ''}|${track?.artist ?? ''}`);

  useEffect(() => {
    TrackPlayer.getRepeatMode().then(setRepeatMode);
  }, []);

  async function togglePlayPause() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }

  async function cycleRepeat() {
    const next =
      repeatMode === RepeatMode.Off ? RepeatMode.Queue : repeatMode === RepeatMode.Queue ? RepeatMode.Track : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    setRepeatMode(next);
    Haptics.selectionAsync();
  }

  async function skip(direction: 'next' | 'previous') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await (direction === 'next' ? TrackPlayer.skipToNext() : TrackPlayer.skipToPrevious());
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[palette.background, theme.colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={28} color={theme.colors.primaryOnDark} />
          </Pressable>
          <Text style={styles.topBarLabel} numberOfLines={1}>
            REPRODUCIENDO
          </Text>
          <Pressable hitSlop={12} onPress={() => navigation.navigate('Queue')}>
            <Ionicons name="list" size={24} color={theme.colors.primaryOnDark} />
          </Pressable>
        </View>

        <View style={styles.artworkWrap}>
          {track?.artwork ? (
            <Image source={{ uri: track.artwork as string }} style={styles.artwork} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[palette.dominant, palette.surface]}
              style={[styles.artwork, styles.artworkFallback]}
            >
              <Ionicons name="musical-note" size={96} color={theme.colors.primaryOnDark} />
            </LinearGradient>
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
            minimumTrackTintColor={palette.accent}
            maximumTrackTintColor={theme.colors.primaryOnDark + '26'}
            thumbTintColor={palette.accent}
            onSlidingComplete={(value) => TrackPlayer.seekTo(value)}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatDuration(progress.position * 1000)}</Text>
            <Text style={styles.time}>{formatDuration(progress.duration * 1000)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable hitSlop={10} onPress={cycleRepeat}>
            <Ionicons
              name={repeatMode === RepeatMode.Track ? 'repeat' : 'repeat'}
              size={22}
              color={repeatMode === RepeatMode.Off ? theme.colors.secondaryOnDark : palette.accent}
            />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => skip('previous')}>
            <Ionicons name="play-skip-back" size={30} color={theme.colors.primaryOnDark} />
          </Pressable>
          <Pressable style={[styles.playButton, { backgroundColor: palette.accent }]} onPress={togglePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={palette.onAccent}
              style={isPlaying ? undefined : { marginLeft: 3 }}
            />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => skip('next')}>
            <Ionicons name="play-skip-forward" size={30} color={theme.colors.primaryOnDark} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="shuffle" size={22} color={theme.colors.secondaryOnDark} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.small,
  },
  topBarLabel: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  artworkWrap: {
    alignItems: 'center',
    marginTop: theme.spacing.large,
  },
  artwork: {
    width: theme.coverSize.hero,
    height: theme.coverSize.hero,
    borderRadius: theme.radii.hero,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  artist: {
    color: theme.colors.secondaryOnDark,
    fontSize: 16,
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
    justifyContent: 'space-between',
    marginTop: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.small,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
