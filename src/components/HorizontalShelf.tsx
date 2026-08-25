import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../theme';

interface HorizontalShelfProps<T> {
  title: string;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onSeeAll?: () => void;
}

/** A titled horizontal card row -- android-source's Home screen repeats this
 * shape five times (continue listening, recently added, favorites, albums,
 * playlists) with only the card content differing, so it's factored out once
 * here instead of five near-duplicate FlatLists. Each card staggers in on
 * first render for a bit of arrival polish (not on every re-render -- only
 * mounts, driven by Reanimated's entering animation lifecycle). */
export function HorizontalShelf<T>({ title, data, keyExtractor, renderItem, onSeeAll }: HorizontalShelfProps<T>) {
  if (data.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <Pressable hitSlop={8} onPress={onSeeAll}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(theme.motion.standard)}>
            {renderItem(item, index)}
          </Animated.View>
        )}
      />
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
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: theme.spacing.large,
    gap: theme.spacing.medium,
  },
});
