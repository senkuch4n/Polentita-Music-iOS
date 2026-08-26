import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllImports, getImportById, getImportItems } from '../db/playlistImportRepository';
import { recoverImportsAfterRestart, subscribeImports } from '../playlistImport/coordinator';
import type { PlaylistImport, PlaylistImportItem } from '../db/types';

export function usePlaylistImportHistory() {
  const db = useSQLiteContext();
  const [imports, setImports] = useState<PlaylistImport[]>([]);

  const reload = useCallback(async () => {
    setImports(await getAllImports(db));
  }, [db]);

  useEffect(() => {
    reload();
    void recoverImportsAfterRestart(db);
    return subscribeImports(reload);
  }, [db, reload]);

  return { imports, reload };
}

export function usePlaylistImportDetail(importId: number | null) {
  const db = useSQLiteContext();
  const [record, setRecord] = useState<PlaylistImport | null>(null);
  const [items, setItems] = useState<PlaylistImportItem[]>([]);

  const reload = useCallback(async () => {
    if (importId == null) {
      setRecord(null);
      setItems([]);
      return;
    }
    const [rec, its] = await Promise.all([getImportById(db, importId), getImportItems(db, importId)]);
    setRecord(rec);
    setItems(its);
  }, [db, importId]);

  useEffect(() => {
    reload();
    return subscribeImports(reload);
  }, [reload]);

  return { record, items, reload };
}
