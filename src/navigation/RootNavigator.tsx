import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { DownloadsHistoryScreen, DownloadsNewScreen } from '../screens/DownloadsScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { PlaylistDetailScreen } from '../screens/PlaylistDetailScreen';
import { SmartPlaylistScreen } from '../screens/SmartPlaylistScreen';
import { SongEditorScreen } from '../screens/SongEditorScreen';
import { TechnicalScreen } from '../screens/TechnicalScreen';
import { theme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.primaryOnDark,
    border: theme.colors.surfaceRaised,
    primary: theme.colors.accent,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primaryOnDark,
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="AlbumDetail" component={PlaceholderScreen} options={{ title: 'Álbum' }} />
        <Stack.Screen name="ArtistDetail" component={PlaceholderScreen} options={{ title: 'Artista' }} />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={({ route }) => ({ title: route.params.playlistName })}
        />
        <Stack.Screen name="SmartPlaylist" component={SmartPlaylistScreen} options={{ title: 'Lista inteligente' }} />
        <Stack.Screen name="PlaylistImport" component={PlaceholderScreen} options={{ title: 'Importar lista' }} />
        <Stack.Screen name="About" component={PlaceholderScreen} options={{ title: 'Acerca de' }} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="Queue" component={PlaceholderScreen} options={{ title: 'Cola' }} />
        <Stack.Screen name="SongEditor" component={SongEditorScreen} options={{ title: 'Editar canción' }} />
        <Stack.Screen name="Technical" component={TechnicalScreen} options={{ title: 'Info técnica' }} />
        <Stack.Screen
          name="ArtworkPicker"
          component={PlaceholderScreen}
          options={{ title: 'Portada', presentation: 'modal' }}
        />
        <Stack.Screen name="DownloadsNew" component={DownloadsNewScreen} options={{ title: 'Descargas' }} />
        <Stack.Screen name="DownloadsHistory" component={DownloadsHistoryScreen} options={{ title: 'Historial' }} />
        <Stack.Screen name="Import" component={PlaceholderScreen} options={{ title: 'Importar' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
