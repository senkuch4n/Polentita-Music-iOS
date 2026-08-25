import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecentAlbums, type AlbumWithCount } from '../db/albumsRepository';
import { getAllPlaylists, type PlaylistWithCount } from '../db/playlistsRepository';
import { getFavorites, getMostPlayed, getRecentlyAdded, getRecentlyPlayed } from '../db/songsRepository';
import type { Song } from '../db/types';

export interface HomeData {
  recentlyAdded: Song[];
  continueListening: Song[];
  favorites: Song[];
  mostPlayed: Song[];
  recentAlbums: AlbumWithCount[];
  playlists: PlaylistWithCount[];
}

const EMPTY: HomeData = {
  recentlyAdded: [],
  continueListening: [],
  favorites: [],
  mostPlayed: [],
  recentAlbums: [],
  playlists: [],
};

export function useHome() {
  const db = useSQLiteContext();
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [recentlyAdded, continueListening, favorites, mostPlayed, recentAlbums, playlists] = await Promise.all([
      getRecentlyAdded(db, 12),
      getRecentlyPlayed(db, 12),
      getFavorites(db),
      getMostPlayed(db, 5),
      getRecentAlbums(db, 12),
      getAllPlaylists(db),
    ]);
    setData({ recentlyAdded, continueListening, favorites, mostPlayed, recentAlbums, playlists });
    setLoading(false);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, reload };
}
