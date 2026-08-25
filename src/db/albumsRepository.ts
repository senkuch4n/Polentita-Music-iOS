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

export interface AlbumWithCount extends Album {
  songCount: number;
}

export async function getAllAlbums(db: SQLiteDatabase, search = ''): Promise<AlbumWithCount[]> {
  const trimmed = search.trim();
  if (trimmed) {
    const like = `%${trimmed}%`;
    return db.getAllAsync<AlbumWithCount>(
      `SELECT a.*, COUNT(s.id) as songCount
       FROM albums a
       JOIN songs s ON s.albumId = a.id AND s.isAvailable = 1
       WHERE a.name LIKE ? COLLATE NOCASE OR a.artist LIKE ? COLLATE NOCASE
       GROUP BY a.id
       ORDER BY a.name COLLATE NOCASE ASC`,
      like,
      like,
    );
  }
  return db.getAllAsync<AlbumWithCount>(
    `SELECT a.*, COUNT(s.id) as songCount
     FROM albums a
     JOIN songs s ON s.albumId = a.id AND s.isAvailable = 1
     GROUP BY a.id
     ORDER BY a.name COLLATE NOCASE ASC`,
  );
}

export async function getRecentAlbums(db: SQLiteDatabase, limit = 20): Promise<AlbumWithCount[]> {
  return db.getAllAsync<AlbumWithCount>(
    `SELECT a.*, COUNT(s.id) as songCount
     FROM albums a
     JOIN songs s ON s.albumId = a.id AND s.isAvailable = 1
     GROUP BY a.id
     ORDER BY a.dateCreated DESC
     LIMIT ?`,
    limit,
  );
}
