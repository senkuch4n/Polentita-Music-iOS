import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllDownloads } from '../db/downloadsRepository';
import { recoverDownloadQueue, subscribeDownloads } from '../downloads/downloadManager';
import type { Download } from '../db/types';

export function useDownloads() {
  const db = useSQLiteContext();
  const [downloads, setDownloads] = useState<Download[]>([]);

  const reload = useCallback(async () => {
    setDownloads(await getAllDownloads(db));
  }, [db]);

  useEffect(() => {
    reload();
    void recoverDownloadQueue(db);
    return subscribeDownloads(reload);
  }, [db, reload]);

  const active = downloads.filter((d) => d.status === 'PENDING' || d.status === 'DOWNLOADING');
  const history = downloads.filter((d) => d.status !== 'PENDING' && d.status !== 'DOWNLOADING');

  return { downloads, active, history, reload };
}
