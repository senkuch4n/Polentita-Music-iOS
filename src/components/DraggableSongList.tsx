import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { ArtworkView } from './ArtworkView';
import { formatDuration } from '../utils/format';
import type { Song } from '../db/types';

const ROW_HEIGHT = 64;

// A dedicated (non-virtualized) reorder mode instead of teaching the normal
// SongRow to drag -- SongRow's horizontal swipe-to-reveal-actions and a
// vertical long-press-drag are both pan gestures on the same row, and layering
// them is exactly the kind of gesture conflict worth avoiding by just having
// two distinct modes: browse (SongRow, swipe/menu) vs reorder (this, drag only).
export function DraggableSongList({ songs, onReorder }: { songs: Song[]; onReorder: (songs: Song[]) => void }) {
  const [order, setOrder] = useState(songs);

  function commitReorder(fromIndex: number, toIndex: number) {
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
      return next;
    });
  }

  return (
    <View style={{ height: order.length * ROW_HEIGHT }}>
      {order.map((song, index) => (
        <DraggableRow
          key={song.id}
          song={song}
          index={index}
          count={order.length}
          onDrop={commitReorder}
        />
      ))}
    </View>
  );
}

function DraggableRow({
  song,
  index,
  count,
  onDrop,
}: {
  song: Song;
  index: number;
  count: number;
  onDrop: (fromIndex: number, toIndex: number) => void;
}) {
  const dragging = useSharedValue(false);
  const translateY = useSharedValue(0);
  const hoverIndex = useSharedValue(index);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragging.value = true;
      hoverIndex.value = index;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
      const rawTarget = index + Math.round(event.translationY / ROW_HEIGHT);
      hoverIndex.value = Math.max(0, Math.min(count - 1, rawTarget));
    })
    .onEnd(() => {
      const target = hoverIndex.value;
      translateY.value = withSpring(0, { damping: 18, stiffness: 260 });
      dragging.value = false;
      if (target !== index) runOnJS(onDrop)(index, target);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: dragging.value ? 1 : 0,
    shadowOpacity: dragging.value ? 0.3 : 0,
    elevation: dragging.value ? theme.elevation.floating : 0,
    backgroundColor: dragging.value ? theme.colors.surfaceRaised : 'transparent',
  }));

  return (
    <Animated.View
      style={[styles.row, { top: index * ROW_HEIGHT }, animatedStyle]}
      layout={LinearTransition.duration(theme.motion.standard)}
    >
      <ArtworkView uri={song.coverUri} seed={`${song.title}|${song.artist}`} size={44} radius={theme.radii.small} />
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {(song.artist || 'Artista desconocido') + ' · ' + formatDuration(song.durationMs)}
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.handle} hitSlop={8}>
          <Ionicons name="reorder-three" size={22} color={theme.colors.secondaryOnDark} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.radii.medium,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    marginTop: 2,
  },
  handle: {
    padding: theme.spacing.small,
  },
});
