import { NativeModules } from 'react-native';

// Typed JS surface over the native PythonBridge module (ios/PythonApp) --
// every method returns a JSON string on the ObjC side (see
// ios/PythonApp/app/yt_dlp_bridge.py for the exact payload shapes this
// mirrors); this module is the single place that parses it.

export interface MediaInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnail: string;
  webpageUrl: string;
  extractor: string;
  extension: string;
  sizeBytes: number;
  path: string;
}

export interface PreviewAudioResult extends MediaInfo {
  streamUrl: string;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnail: string;
  webpageUrl: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  webpageUrl: string;
  entries: PlaylistEntry[];
  totalTracks: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  channel: string;
  durationMs: number;
  thumbnail: string;
  webpageUrl: string;
  uploadDate: string;
}

export interface SearchYoutubeResult {
  items: SearchResultItem[];
  page: number;
  hasMore: boolean;
}

interface PythonBridgeNativeModule {
  inspectMedia(url: string): Promise<string>;
  inspectPlaylist(url: string): Promise<string>;
  previewAudio(url: string): Promise<string>;
  searchYoutube(query: string, page: number, pageSize: number): Promise<string>;
  downloadAudio(url: string, outputDir: string): Promise<string>;
}

const native = NativeModules.PythonBridge as PythonBridgeNativeModule;

export async function searchYoutube(query: string, page = 0, pageSize = 20): Promise<SearchYoutubeResult> {
  return JSON.parse(await native.searchYoutube(query, page, pageSize));
}

export async function inspectMedia(url: string): Promise<MediaInfo> {
  return JSON.parse(await native.inspectMedia(url));
}

export async function inspectPlaylist(url: string): Promise<PlaylistInfo> {
  return JSON.parse(await native.inspectPlaylist(url));
}

export async function previewAudio(url: string): Promise<PreviewAudioResult> {
  return JSON.parse(await native.previewAudio(url));
}

export async function downloadAudio(url: string, outputDir: string): Promise<MediaInfo> {
  return JSON.parse(await native.downloadAudio(url, outputDir));
}
