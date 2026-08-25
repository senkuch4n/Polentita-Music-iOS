// Ported 1:1 from the Android app's core/designsystem/DesignTokens.kt
// (android-source/app/src/main/java/com/polentita/music/core/designsystem/DesignTokens.kt)
// so the iOS app keeps the same visual language. Light theme + adaptive
// artwork-driven palette (ArtworkDynamicTheme.kt on Android) are not ported
// yet -- this is the dark fallback palette only, ported first for v0.

export const spacing = {
  xxs: 2,
  xs: 4,
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
} as const;

export const coverSize = {
  mini: 48,
  row: 56,
  shelf: 156,
  albumGrid: 168,
  hero: 288,
} as const;

export const radii = {
  small: 12,
  medium: 16,
  large: 24,
  hero: 30,
  pill: 100,
} as const;

export const elevation = {
  resting: 0,
  floating: 8,
  artwork: 18,
} as const;

export const opacity = {
  secondary: 0.72,
  disabled: 0.42,
  glass: 0.82,
  scrim: 0.66,
  subtle: 0.12,
  border: 0.28,
  surface: 0.94,
} as const;

export const motion = {
  quick: 180,
  standard: 280,
  artwork: 420,
  slow: 520,
} as const;

export const fallbackColors = {
  background: '#070A0C',
  surface: '#101719',
  surfaceRaised: '#1A2427',
  accent: '#64D8E8',
  queueSwipe: '#075B6B',
  onDark: '#F7F5EF',
} as const;

export const contentColors = {
  primaryOnDark: '#F8F7F3',
  secondaryOnDark: '#C9C7C1',
  disabledOnDark: '#8B8984',
  darkOnBright: '#15120F',
} as const;
