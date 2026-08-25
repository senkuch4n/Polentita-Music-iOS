// Mirrors the Android app's NavHost routes (MainActivity.kt) so the iOS
// screen inventory stays 1:1 with Android during the port.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Playlists: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  AlbumDetail: { albumId: string };
  ArtistDetail: { artist: string };
  PlaylistDetail: { playlistId: number; playlistName: string };
  SmartPlaylist: { kind: 'favorites' | 'mostPlayed' };
  PlaylistImport: undefined;
  About: undefined;
  Player: undefined;
  Queue: undefined;
  SongEditor: { songId: string };
  Technical: { songId: string };
  ArtworkPicker: { songId: string };
  DownloadsNew: undefined;
  DownloadsHistory: undefined;
  Import: undefined;
};
