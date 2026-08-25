import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deleteDownload,
  getPendingDownload,
  markCancelled,
  markCompleted,
  markDownloading,
  markFailed,
  updateDownloadProgress,
  insertDownload,
} from '../db/downloadsRepository';
import type { Download } from '../db/types';
import { directorySizeBytes, downloadsDirectory, ensureLibraryDirectories, toFileUri, toPosixPath } from '../library/paths';
import { downloadAudio, type SearchResultItem } from '../native/pythonBridge';
import { finalizeDownloadedSong } from './finalizeDownload';

// Single-flight download queue. The native bridge serializes every Python
// call onto one dedicated thread anyway (see PythonRuntime.m), so there's no
// benefit to running more than one download at a time -- this just makes
// that constraint explicit and gives Search/Downloads screens a shared,
// app-lifetime queue that keeps running while the user navigates elsewhere.
//
// Progress: PythonBridgeModule.downloadAudio is a one-shot promise with no
// progress/cancel channel wired from JS yet (its ObjC progress/cancel blocks
// are native no-ops -- see PythonBridgeModule.m). Progress here is derived by
// polling bytes physically written to disk instead (see paths.directorySizeBytes).
// Cancellation is "soft": the in-flight native call can't be interrupted, so a
// cancelled download keeps running in the background and its result is
// discarded on completion instead of being finalized into the library.

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeDownloads(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let processing = false;
let recovered = false;
const cancelledIds = new Set<number>();

export async function enqueueDownload(db: SQLiteDatabase, item: SearchResultItem): Promise<void> {
  console.log('[downloads] enqueueDownload called for', item.id, item.title);
  await insertDownload(db, {
    sourceUrl: item.webpageUrl,
    videoId: item.id,
    title: item.title,
    artist: item.channel,
    thumbnail: item.thumbnail || null,
  });
  console.log('[downloads] row inserted, notifying + kicking queue');
  notify();
  void processQueue(db);
}

export async function cancelDownload(db: SQLiteDatabase, download: Download): Promise<void> {
  if (download.status === 'PENDING') {
    await deleteDownload(db, download.id);
  } else if (download.status === 'DOWNLOADING') {
    cancelledIds.add(download.id);
    await markCancelled(db, download.id);
  }
  notify();
}

// Marks anything left as 'DOWNLOADING' from a previous app run as failed --
// the in-flight Python call died with the process, so there's nothing to
// resume -- then resumes any still-'PENDING' items. Call once per app launch.
export async function recoverDownloadQueue(db: SQLiteDatabase): Promise<void> {
  if (recovered) return;
  recovered = true;
  await db.runAsync(
    "UPDATE downloads SET status = 'FAILED', errorMessage = 'Interrumpida (la app se cerró)', completedAt = ? WHERE status = 'DOWNLOADING'",
    Date.now(),
  );
  void processQueue(db);
}

async function processQueue(db: SQLiteDatabase): Promise<void> {
  if (processing) {
    console.log('[downloads] processQueue: already processing, skip');
    return;
  }
  const next = await getPendingDownload(db);
  if (!next) {
    console.log('[downloads] processQueue: nothing pending');
    return;
  }
  console.log('[downloads] processQueue: starting', next.id, next.title);
  processing = true;
  try {
    await runDownload(db, next);
  } finally {
    processing = false;
    void processQueue(db);
  }
}

async function runDownload(db: SQLiteDatabase, download: Download): Promise<void> {
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  try {
    ensureLibraryDirectories();
    await markDownloading(db, download.id);
    notify();
    console.log('[downloads] marked DOWNLOADING', download.id);

    const baseline = directorySizeBytes(downloadsDirectory);
    progressTimer = setInterval(() => {
      const current = directorySizeBytes(downloadsDirectory);
      updateDownloadProgress(db, download.id, Math.max(0, current - baseline), -1)
        .then(notify)
        .catch(() => {});
    }, 800);

    const outputDir = toPosixPath(downloadsDirectory.uri);
    console.log('[downloads] calling downloadAudio', download.sourceUrl, outputDir);
    const media = await downloadAudio(download.sourceUrl, outputDir);
    console.log('[downloads] downloadAudio resolved', media.path);
    clearInterval(progressTimer);
    progressTimer = null;

    if (cancelledIds.delete(download.id)) {
      const leftover = new File(toFileUri(media.path));
      if (leftover.exists) leftover.delete();
      return;
    }

    const song = await finalizeDownloadedSong(db, media);
    console.log('[downloads] finalized song', song.id);
    await markCompleted(db, download.id, song.id);
  } catch (error) {
    console.log('[downloads] FAILED', error instanceof Error ? error.message : String(error));
    if (progressTimer) clearInterval(progressTimer);
    if (cancelledIds.delete(download.id)) {
      return;
    }
    await markFailed(db, download.id, error instanceof Error ? error.message : String(error));
  } finally {
    notify();
  }
}
