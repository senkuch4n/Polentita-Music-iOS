import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllAlbums, type AlbumWithCount } from '../db/albumsRepository';
import { getArtistSummaries, type ArtistSummary } from '../db/artistsRepository';
import { getLibrarySongs, type SongSortBy } from '../db/songsRepository';
import { useDebouncedValue } from './useDebouncedValue';
import type { Song } from '../db/types';

export type SortDirection = 'asc' | 'desc';

// Fetches all three tabs' data together (not just the active one) so
// switching tabs is instant with no per-tab loading spinner -- mirrors how
// android-source's Crossfade implies the destination content is already
// loaded before the transition starts.
export function useLibrary(sortBy: SongSortBy, direction: SortDirection, searchInput: string) {
  const db = useSQLiteContext();
  const search = useDebouncedValue(searchInput, 300);

  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [songResults, albumResults, artistResults] = await Promise.all([
      getLibrarySongs(db, { sortBy, direction, search }),
      getAllAlbums(db, search),
      getArtistSummaries(db, search),
    ]);
    setSongs(songResults);
    setAlbums(albumResults);
    setArtists(artistResults);
    setLoading(false);
  }, [db, sortBy, direction, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { songs, albums, artists, loading, reload };
}
