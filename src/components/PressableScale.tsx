import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, stiffness: 300, mass: 0.5 } as const;

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}

/** Every card/pill on android-source's Home screen scales 1→0.97 on press
 * with a springy Compose animation -- it's the single most-repeated tactile
 * detail on that screen. This is its Reanimated equivalent, reused across
 * every pressable surface here instead of a bare `Pressable`. */
export function PressableScale({ children, style, haptic, onPressIn, onPressOut, onPress, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
