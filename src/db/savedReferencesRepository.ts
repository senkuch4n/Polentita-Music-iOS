import type { SQLiteDatabase } from 'expo-sqlite';

export interface SavedReference {
  id: number;
  sourceUrl: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  durationMs: number;
  savedAt: number;
}

export interface NewSavedReference {
  sourceUrl: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  durationMs: number;
}

export async function getAllSavedReferences(db: SQLiteDatabase): Promise<SavedReference[]> {
  return db.getAllAsync<SavedReference>('SELECT * FROM saved_references ORDER BY savedAt DESC');
}

export async function saveReference(db: SQLiteDatabase, reference: NewSavedReference): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO saved_references (sourceUrl, videoId, title, channel, thumbnail, durationMs, savedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    reference.sourceUrl,
    reference.videoId,
    reference.title,
    reference.channel,
    reference.thumbnail,
    reference.durationMs,
    Date.now(),
  );
}

export async function removeSavedReferenceByVideoId(db: SQLiteDatabase, videoId: string): Promise<void> {
  await db.runAsync('DELETE FROM saved_references WHERE videoId = ?', videoId);
}
