import { StyleSheet } from 'react-native';
import {
  spacing,
  coverSize,
  radii,
  elevation,
  opacity,
  motion,
  fallbackColors,
  contentColors,
} from './tokens';

export const theme = {
  spacing,
  coverSize,
  radii,
  elevation,
  opacity,
  motion,
  colors: {
    ...fallbackColors,
    ...contentColors,
  },
} as const;

export type Theme = typeof theme;

export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.large,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 15,
    marginTop: theme.spacing.small,
  },
});
