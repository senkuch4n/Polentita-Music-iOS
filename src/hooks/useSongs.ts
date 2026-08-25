import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllSongs, getRecentlyAdded } from '../db/songsRepository';
import type { Song } from '../db/types';

export function useAllSongs() {
  const db = useSQLiteContext();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setSongs(await getAllSongs(db));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { songs, loading, reload };
}

export function useRecentlyAdded(limit = 10) {
  const db = useSQLiteContext();
  const [songs, setSongs] = useState<Song[]>([]);

  const reload = useCallback(async () => {
    setSongs(await getRecentlyAdded(db, limit));
  }, [db, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { songs, reload };
}
