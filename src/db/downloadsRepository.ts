import type { SQLiteDatabase } from 'expo-sqlite';
import type { Download } from './types';

export interface NewDownload {
  sourceUrl: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
}

export async function insertDownload(db: SQLiteDatabase, download: NewDownload): Promise<Download> {
  const result = await db.runAsync(
    `INSERT INTO downloads (sourceUrl, videoId, title, artist, thumbnail, status, createdAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
    download.sourceUrl,
    download.videoId,
    download.title,
    download.artist,
    download.thumbnail,
    Date.now(),
  );
  const inserted = await db.getFirstAsync<Download>('SELECT * FROM downloads WHERE id = ?', result.lastInsertRowId);
  return inserted!;
}

export async function getAllDownloads(db: SQLiteDatabase): Promise<Download[]> {
  return db.getAllAsync<Download>('SELECT * FROM downloads ORDER BY createdAt DESC');
}

export async function getPendingDownload(db: SQLiteDatabase): Promise<Download | null> {
  const row = await db.getFirstAsync<Download>(
    "SELECT * FROM downloads WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 1",
  );
  return row ?? null;
}

export async function markDownloading(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("UPDATE downloads SET status = 'DOWNLOADING' WHERE id = ?", id);
}

export async function updateDownloadProgress(
  db: SQLiteDatabase,
  id: number,
  bytesDownloaded: number,
  totalBytes: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE downloads SET bytesDownloaded = ?, totalBytes = ? WHERE id = ?',
    bytesDownloaded,
    totalBytes,
    id,
  );
}

export async function markCompleted(db: SQLiteDatabase, id: number, songId: number): Promise<void> {
  await db.runAsync(
    "UPDATE downloads SET status = 'COMPLETED', songId = ?, completedAt = ? WHERE id = ?",
    songId,
    Date.now(),
    id,
  );
}

export async function markFailed(db: SQLiteDatabase, id: number, errorMessage: string): Promise<void> {
  await db.runAsync(
    "UPDATE downloads SET status = 'FAILED', errorMessage = ?, completedAt = ? WHERE id = ?",
    errorMessage,
    Date.now(),
    id,
  );
}

export async function markCancelled(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("UPDATE downloads SET status = 'CANCELLED', completedAt = ? WHERE id = ?", Date.now(), id);
}

export async function deleteDownload(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM downloads WHERE id = ?', id);
}
