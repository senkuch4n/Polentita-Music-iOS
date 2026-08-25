import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../theme';
import { PressableScale } from './PressableScale';
import type { Song } from '../db/types';

const TOP_RANK_OPACITY = ['FF', 'CC', '99'];

export function MostPlayedRanking({
  songs,
  onPress,
  onSeeAll,
}: {
  songs: Song[];
  onPress: (song: Song, index: number) => void;
  onSeeAll?: () => void;
}) {
  if (songs.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Más escuchadas</Text>
        {onSeeAll && (
          <Pressable hitSlop={8} onPress={onSeeAll}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.card}>
        {songs.map((song, index) => (
          <Animated.View key={song.id} entering={FadeInDown.delay(index * 40).duration(theme.motion.standard)}>
            <PressableScale
              style={[styles.row, index < songs.length - 1 && styles.rowDivider]}
              onPress={() => onPress(song, index)}
              haptic
            >
              <Text
                style={[
                  styles.rank,
                  { color: theme.colors.accent + (TOP_RANK_OPACITY[index] ?? '55') },
                ]}
              >
                {index + 1}
              </Text>
              <View style={styles.textBlock}>
                <Text style={styles.rowTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {(song.artist || 'Artista desconocido') + ` · ${song.playCount} reproducciones`}
                </Text>
              </View>
              <Ionicons name="play-circle" size={26} color={theme.colors.accent} />
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  sectionTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: theme.spacing.large,
    borderRadius: theme.radii.large,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.primaryOnDark + '14',
  },
  rank: {
    fontSize: 20,
    fontWeight: '800',
    width: 28,
    textAlign: 'center',
  },
  textBlock: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    marginTop: 2,
  },
});
