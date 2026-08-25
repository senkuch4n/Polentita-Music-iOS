import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

// Screens nested inside the Tabs navigator still need to reach root-level
// routes (Player, detail screens, etc.) -- React Navigation bubbles
// navigate() calls up to the nearest matching navigator at runtime.
export function useRootNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
