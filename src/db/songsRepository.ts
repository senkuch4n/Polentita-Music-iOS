import type { SQLiteDatabase } from 'expo-sqlite';
import type { Song, SourceType } from './types';

// expo-sqlite returns booleans as 0/1 integers -- normalize on the way out.
function rowToSong(row: any): Song {
  return {
    ...row,
    isFavorite: !!row.isFavorite,
    isAvailable: !!row.isAvailable,
  };
}

export interface NewSong {
  title: string;
  artist: string;
  albumId: number | null;
  albumName: string;
  genre: string;
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  durationMs: number;
  contentUri: string;
  originalFileName: string;
  displayFileName: string;
  mimeType: string;
  fileSize: number;
  coverUri: string | null;
  sourceType: SourceType;
  checksum: string;
}

export async function insertSong(db: SQLiteDatabase, song: NewSong): Promise<Song> {
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO songs (
      title, artist, albumId, albumName, genre, year, trackNumber, discNumber,
      durationMs, contentUri, originalFileName, displayFileName, mimeType, fileSize,
      coverUri, sourceType, sourceUrl, dateAdded, dateModified, lastPlayedAt,
      playCount, isFavorite, isAvailable, checksum, isrc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 0, 0, 1, ?, NULL)`,
    song.title,
    song.artist,
    song.albumId,
    song.albumName,
    song.genre,
    song.year,
    song.trackNumber,
    song.discNumber,
    song.durationMs,
    song.contentUri,
    song.originalFileName,
    song.displayFileName,
    song.mimeType,
    song.fileSize,
    song.coverUri,
    song.sourceType,
    now,
    now,
    song.checksum,
  );
  const inserted = await db.getFirstAsync<any>('SELECT * FROM songs WHERE id = ?', result.lastInsertRowId);
  return rowToSong(inserted);
}

export async function findSongByChecksum(db: SQLiteDatabase, checksum: string): Promise<Song | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM songs WHERE checksum = ?', checksum);
  return row ? rowToSong(row) : null;
}

export async function getAllSongs(db: SQLiteDatabase): Promise<Song[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM songs WHERE isAvailable = 1 ORDER BY title COLLATE NOCASE ASC',
  );
  return rows.map(rowToSong);
}

export async function getRecentlyAdded(db: SQLiteDatabase, limit = 20): Promise<Song[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM songs WHERE isAvailable = 1 ORDER BY dateAdded DESC LIMIT ?',
    limit,
  );
  return rows.map(rowToSong);
}

export async function getMostPlayed(db: SQLiteDatabase, limit = 20): Promise<Song[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM songs WHERE isAvailable = 1 AND playCount > 0 ORDER BY playCount DESC LIMIT ?',
    limit,
  );
  return rows.map(rowToSong);
}

export async function getSongById(db: SQLiteDatabase, id: number): Promise<Song | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM songs WHERE id = ?', id);
  return row ? rowToSong(row) : null;
}

export async function toggleFavorite(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE songs SET isFavorite = NOT isFavorite WHERE id = ?', id);
}

export async function recordPlay(db: SQLiteDatabase, id: number): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE songs SET playCount = playCount + 1, lastPlayedAt = ? WHERE id = ?',
    now,
    id,
  );
  await db.runAsync(
    'INSERT INTO playback_history (songId, playedAt, completed, playbackPositionMs) VALUES (?, ?, 0, 0)',
    id,
    now,
  );
}

export async function deleteSong(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM songs WHERE id = ?', id);
}
