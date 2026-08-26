import type { ImportSource } from '../../db/types';

export interface ImportedTrack {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  originalPosition: number;
  // Only YouTube-sourced tracks carry this -- inspect_playlist already gives
  // the exact video, so there's nothing to search/match against.
  directMatch?: {
    videoId: string;
    webpageUrl: string;
    thumbnail: string | null;
  };
}

export interface ImportedCollection {
  source: ImportSource;
  sourceId: string;
  sourceUrl: string | null;
  name: string;
  description: string;
  artworkUrl: string | null;
  owner: string | null;
  tracks: ImportedTrack[];
}
