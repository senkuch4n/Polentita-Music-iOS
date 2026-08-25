import { useRef } from 'react';
import { ActionSheetIOS, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ArtworkView } from './ArtworkView';
import { theme } from '../theme';
import { formatDuration } from '../utils/format';
import type { Song } from '../db/types';

export interface SongRowSwipeAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

interface SongRowProps {
  song: Song;
  isActive?: boolean;
  isPlaying?: boolean;
  onPress: () => void;
  swipeAction?: SongRowSwipeAction;
  onToggleFavorite?: () => void;
  onEdit?: () => void;
  onTechnicalInfo?: () => void;
  onDelete?: () => void;
}

/** Mirrors android-source's SongRow: artwork, title/artist/duration, favorite
 * heart, active-song highlight -- a configurable swipe action replaces
 * Android's custom long-press-drag gesture with a native iOS swipe (Mail-style),
 * since that's the idiom iOS users already know. */
export function SongRow({
  song,
  isActive,
  isPlaying,
  onPress,
  swipeAction,
  onToggleFavorite,
  onEdit,
  onTechnicalInfo,
  onDelete,
}: SongRowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const hasMenu = onEdit || onTechnicalInfo || onDelete;

  function openMenu() {
    const options: string[] = [];
    const actions: (() => void)[] = [];
    if (onEdit) {
      options.push('Editar información');
      actions.push(onEdit);
    }
    if (onTechnicalInfo) {
      options.push('Información técnica');
      actions.push(onTechnicalInfo);
    }
    if (onDelete) {
      options.push('Eliminar de la biblioteca');
      actions.push(onDelete);
    }
    options.push('Cancelar');
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = onDelete ? options.length - 2 : undefined;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex, destructiveButtonIndex, title: song.title },
      (index) => {
        if (index < actions.length) actions[index]();
      },
    );
  }

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    if (!swipeAction) return null;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [64, 0] });
    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
        <Pressable
          style={[styles.swipeActionButton, { backgroundColor: swipeAction.color ?? theme.colors.accent }]}
          onPress={() => {
            swipeAction.onPress();
            swipeRef.current?.close();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name={swipeAction.icon} size={20} color={theme.colors.darkOnBright} />
          <Text style={styles.swipeActionText}>{swipeAction.label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const row = (
    <Pressable
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      android_disableSound
    >
      <ArtworkView uri={song.coverUri} seed={`${song.title}|${song.artist}`} size={theme.coverSize.row} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {(song.artist || 'Artista desconocido') + ' · ' + formatDuration(song.durationMs)}
        </Text>
      </View>
      {isActive && (
        <Ionicons
          name={isPlaying ? 'volume-high' : 'pause'}
          size={16}
          color={theme.colors.accent}
          style={styles.activeIcon}
        />
      )}
      {onToggleFavorite && (
        <Pressable hitSlop={8} onPress={onToggleFavorite} style={styles.favoriteButton}>
          <Ionicons
            name={song.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={song.isFavorite ? theme.colors.accent : theme.colors.secondaryOnDark}
          />
        </Pressable>
      )}
      {hasMenu && (
        <Pressable hitSlop={8} onPress={openMenu} style={styles.favoriteButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.secondaryOnDark} />
        </Pressable>
      )}
    </Pressable>
  );

  if (!swipeAction) return row;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    gap: theme.spacing.medium,
    backgroundColor: theme.colors.background,
  },
  rowActive: {
    backgroundColor: theme.colors.accent + '14',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  titleActive: {
    color: theme.colors.accent,
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    marginTop: 2,
  },
  activeIcon: {
    marginHorizontal: theme.spacing.xs,
  },
  favoriteButton: {
    padding: theme.spacing.xs,
  },
  swipeAction: {
    width: 96,
  },
  swipeActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeActionText: {
    color: theme.colors.darkOnBright,
    fontSize: 11,
    fontWeight: '700',
  },
});
