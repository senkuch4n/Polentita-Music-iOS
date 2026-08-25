import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (key: T) => void;
}

/** Songs/Albums/Artists tab bar -- the active tab's highlight fades in/out
 * (alpha 0→0.16, tween(quick)) instead of a sliding indicator, matching
 * android-source's animateColorAsState treatment. */
export function SegmentedTabs<T extends string>({ tabs, active, onChange }: SegmentedTabsProps<T>) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => (
        <SegmentTab key={tab.key} label={tab.label} active={active === tab.key} onPress={() => onChange(tab.key)} />
      ))}
    </View>
  );
}

function SegmentTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const highlight = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    highlight.value = withTiming(active ? 1 : 0, { duration: theme.motion.quick });
  }, [active, highlight]);

  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.value }));

  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.highlight, highlightStyle]} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radii.pill,
    padding: 3,
    marginHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    overflow: 'hidden',
  },
  highlight: {
    backgroundColor: theme.colors.accent + '29',
    borderRadius: theme.radii.pill,
  },
  label: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: theme.colors.accent,
  },
});
