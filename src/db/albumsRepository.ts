import type { SQLiteDatabase } from 'expo-sqlite';
import type { Album } from './types';

export async function findOrCreateAlbum(
  db: SQLiteDatabase,
  name: string,
  artist: string,
  year: number | null,
  coverUri: string | null,
): Promise<Album | null> {
  if (!name) return null;

  const existing = await db.getFirstAsync<Album>(
    'SELECT * FROM albums WHERE name = ? AND artist = ?',
    name,
    artist,
  );
  if (existing) return existing;

  const result = await db.runAsync(
    'INSERT INTO albums (name, artist, year, coverUri, dateCreated) VALUES (?, ?, ?, ?, ?)',
    name,
    artist,
    year,
    coverUri,
    Date.now(),
  );
  return db.getFirstAsync<Album>('SELECT * FROM albums WHERE id = ?', result.lastInsertRowId);
}
