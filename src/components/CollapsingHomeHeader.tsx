import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { theme } from '../theme';

const TAGLINES = [
  'Sonreí, tu playlist te está esperando.',
  'Modo offline: la música no depende del wifi.',
  'Un ratito de pausa nunca vino mal.',
  'Hoy es buen día para descubrir algo nuevo.',
  'El Dino también extraña que juegues.',
];

// Header collapses over 180 logical px of scroll, fading out slightly
// before the distance is fully covered and drifting up 18px -- mirrors
// android-source's CollapsingHomeHeader scroll-fraction math.
const COLLAPSE_DISTANCE = 180;

export function CollapsingHomeHeader({ scrollY }: { scrollY: SharedValue<number> }) {
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.8], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, -18], Extrapolation.CLAMP) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.7], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.header, headerStyle]}>
      <Text style={styles.eyebrow}>HI-FI</Text>
      <Text style={styles.title}>Polentita Music</Text>
      <Animated.Text style={[styles.tagline, taglineStyle]} numberOfLines={1}>
        {tagline}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 112,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.small,
    justifyContent: 'center',
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: theme.spacing.xxs,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 28,
    fontWeight: '700',
  },
  tagline: {
    color: theme.colors.secondaryOnDark,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
});
