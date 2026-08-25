import { createBottomTabNavigator, BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import { theme } from '../theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Library: 'library',
  Search: 'search',
  Playlists: 'list',
  Settings: 'settings',
};

function TabBarWithMiniPlayer(props: BottomTabBarProps) {
  return (
    <View>
      <MiniPlayer />
      <BottomTabBar {...props} />
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primaryOnDark,
        headerLargeTitle: true,
        headerLargeTitleStyle: { color: theme.colors.primaryOnDark },
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceRaised },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondaryOnDark,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name as keyof TabParamList] : (`${TAB_ICONS[route.name as keyof TabParamList]}-outline` as keyof typeof Ionicons.glyphMap)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Biblioteca' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Buscar' }} />
      <Tab.Screen name="Playlists" component={PlaylistsScreen} options={{ title: 'Listas' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
    </Tab.Navigator>
  );
}
