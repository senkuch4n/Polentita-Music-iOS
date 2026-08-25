import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { fallbackArtworkPalette } from '../theme/artworkPalette';
import { theme } from '../theme';

interface ArtworkViewProps {
  uri?: string | null;
  seed: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Cover art, or a deterministic per-song gradient (ported from Android's
 * ArtworkColorAnalyzer.fallback) so every track has "its own" glow even
 * without artwork. */
export function ArtworkView({ uri, seed, size = theme.coverSize.row, radius = theme.radii.medium, style }: ArtworkViewProps) {
  const containerStyle = [{ width: size, height: size, borderRadius: radius }, styles.container, style];

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
    );
  }

  const palette = fallbackArtworkPalette(seed);
  return (
    <LinearGradient
      colors={[palette.dominant, palette.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[containerStyle, styles.center]}
    >
      <Ionicons name="musical-note" size={size * 0.4} color={theme.colors.primaryOnDark} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceRaised,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
