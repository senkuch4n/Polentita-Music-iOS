// Mirrors android-source's Entities.kt field-for-field (booleans as 0/1, timestamps
// as epoch millis, matching the Android app's convention).

export type SourceType = 'IMPORTED' | 'DOWNLOADED' | 'SCANNED';

export interface Album {
  id: number;
  name: string;
  artist: string;
  year: number | null;
  coverUri: string | null;
  dateCreated: number;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  albumId: number | null;
  albumName: string;
  genre: string;
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  durationMs: number;
  contentUri: string;
  originalFileName: string;
  displayFileName: string;
  mimeType: string;
  fileSize: number;
  coverUri: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  dateAdded: number;
  dateModified: number;
  lastPlayedAt: number | null;
  playCount: number;
  isFavorite: boolean;
  isAvailable: boolean;
  checksum: string;
  isrc: string | null;
}

export interface Playlist {
  id: number;
  name: string;
  description: string;
  coverUri: string | null;
  dateCreated: number;
  dateModified: number;
}

export interface PlaylistSongCrossRef {
  playlistId: number;
  songId: number;
  position: number;
  dateAdded: number;
}
