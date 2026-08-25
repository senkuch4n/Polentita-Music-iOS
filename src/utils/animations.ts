import { Easing, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

// Fade+scale entering/exiting, matching android-source's featured "now
// playing" card crossfade (AnimatedContent: fadeIn+scaleIn(0.96) on enter,
// fadeOut+scaleOut(0.96) on exit) -- Reanimated's built-in FadeIn/FadeOut
// presets don't touch scale, so this is a small custom worklet pair instead.
export function fadeScaleEntering(durationMs: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
      animations: {
        opacity: withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
        transform: [{ scale: withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }) }],
      },
    };
  };
}

export function fadeScaleExiting(durationMs: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ scale: 1 }] },
      animations: {
        opacity: withTiming(0, { duration: durationMs, easing: Easing.in(Easing.cubic) }),
        transform: [{ scale: withTiming(0.96, { duration: durationMs, easing: Easing.in(Easing.cubic) }) }],
      },
    };
  };
}
