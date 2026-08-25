import { useRoute } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { screenStyles } from '../theme';

// Stub for screens not yet ported off the Android app -- swapped out one at
// a time as feature parity work lands (see build order in the project plan).
export function PlaceholderScreen() {
  const route = useRoute();
  return (
    <View style={screenStyles.screen}>
      <View style={screenStyles.content}>
        <Text style={screenStyles.title}>{route.name}</Text>
        <Text style={screenStyles.subtitle}>Todavía no portado desde Android.</Text>
      </View>
    </View>
  );
}
