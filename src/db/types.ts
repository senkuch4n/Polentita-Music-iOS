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

export type DownloadStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Download {
  id: number;
  sourceUrl: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
  errorMessage: string | null;
  songId: number | null;
  createdAt: number;
  completedAt: number | null;
}

export type ImportSource = 'file' | 'spotify' | 'youtube';
export type ImportState = 'ANALYZED' | 'REVIEW' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'PARTIAL' | 'CANCELLED' | 'ERROR';
export type ImportItemState =
  | 'PENDING'
  | 'SEARCHING'
  | 'PROBABLE_MATCH'
  | 'REQUIRES_REVIEW'
  | 'IN_LIBRARY'
  | 'DOWNLOADING'
  | 'COMPLETED'
  | 'OMITTED'
  | 'ERROR';
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PlaylistImport {
  id: number;
  source: ImportSource;
  sourceId: string;
  sourceUrl: string | null;
  name: string;
  description: string;
  artworkUrl: string | null;
  owner: string | null;
  totalTracks: number;
  localPlaylistId: number | null;
  state: ImportState;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  errorMessage: string | null;
}

export interface PlaylistImportItem {
  id: number;
  importId: number;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  originalPosition: number;
  selected: boolean;
  state: ImportItemState;
  directVideoId: string | null;
  directUrl: string | null;
  directThumbnail: string | null;
  localSongId: number | null;
  selectedCandidateId: number | null;
  attemptCount: number;
  errorMessage: string | null;
}

export interface PlaylistImportCandidate {
  id: number;
  itemId: number;
  videoId: string;
  title: string;
  channel: string;
  durationMs: number;
  thumbnail: string | null;
  webpageUrl: string;
  score: number;
  confidence: MatchConfidence;
  rank: number;
}
