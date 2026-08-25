import type { SQLiteDatabase } from 'expo-sqlite';
import type { Playlist, Song } from './types';

export interface PlaylistWithCount extends Playlist {
  songCount: number;
}

export async function getAllPlaylists(db: SQLiteDatabase): Promise<PlaylistWithCount[]> {
  return db.getAllAsync<PlaylistWithCount>(
    `SELECT p.*, COUNT(ps.songId) as songCount
     FROM playlists p
     LEFT JOIN playlist_songs ps ON ps.playlistId = p.id
     GROUP BY p.id
     ORDER BY p.dateModified DESC`,
  );
}

export async function getPlaylistById(db: SQLiteDatabase, id: number): Promise<Playlist | null> {
  return db.getFirstAsync<Playlist>('SELECT * FROM playlists WHERE id = ?', id);
}

export async function createPlaylist(db: SQLiteDatabase, name: string, description = '', coverUri: string | null = null): Promise<Playlist> {
  const now = Date.now();
  const result = await db.runAsync(
    'INSERT INTO playlists (name, description, coverUri, dateCreated, dateModified) VALUES (?, ?, ?, ?, ?)',
    name,
    description,
    coverUri,
    now,
    now,
  );
  const playlist = await getPlaylistById(db, result.lastInsertRowId);
  if (!playlist) throw new Error('No se pudo crear la lista');
  return playlist;
}

export async function renamePlaylist(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE playlists SET name = ?, dateModified = ? WHERE id = ?', name, Date.now(), id);
}

export async function updatePlaylistDetails(
  db: SQLiteDatabase,
  id: number,
  details: { name: string; description: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE playlists SET name = ?, description = ?, dateModified = ? WHERE id = ?',
    details.name,
    details.description,
    Date.now(),
    id,
  );
}

export async function updatePlaylistCover(db: SQLiteDatabase, id: number, coverUri: string | null): Promise<void> {
  await db.runAsync('UPDATE playlists SET coverUri = ?, dateModified = ? WHERE id = ?', coverUri, Date.now(), id);
}

export async function reorderPlaylistSongs(db: SQLiteDatabase, playlistId: number, orderedSongIds: number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let position = 0; position < orderedSongIds.length; position++) {
      await db.runAsync(
        'UPDATE playlist_songs SET position = ? WHERE playlistId = ? AND songId = ?',
        position,
        playlistId,
        orderedSongIds[position],
      );
    }
  });
  await db.runAsync('UPDATE playlists SET dateModified = ? WHERE id = ?', Date.now(), playlistId);
}

export async function deletePlaylist(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM playlists WHERE id = ?', id);
}

function rowToSong(row: any): Song {
  return { ...row, isFavorite: !!row.isFavorite, isAvailable: !!row.isAvailable };
}

export async function getPlaylistSongs(db: SQLiteDatabase, playlistId: number): Promise<Song[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT s.* FROM songs s
     JOIN playlist_songs ps ON ps.songId = s.id
     WHERE ps.playlistId = ?
     ORDER BY ps.position ASC`,
    playlistId,
  );
  return rows.map(rowToSong);
}

export async function addSongsToPlaylist(db: SQLiteDatabase, playlistId: number, songIds: number[]): Promise<void> {
  const existing = await db.getFirstAsync<{ maxPosition: number | null }>(
    'SELECT MAX(position) as maxPosition FROM playlist_songs WHERE playlistId = ?',
    playlistId,
  );
  let nextPosition = (existing?.maxPosition ?? -1) + 1;
  const now = Date.now();
  for (const songId of songIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO playlist_songs (playlistId, songId, position, dateAdded) VALUES (?, ?, ?, ?)',
      playlistId,
      songId,
      nextPosition,
      now,
    );
    nextPosition++;
  }
  await db.runAsync('UPDATE playlists SET dateModified = ? WHERE id = ?', now, playlistId);
}

export async function removeSongFromPlaylist(db: SQLiteDatabase, playlistId: number, songId: number): Promise<void> {
  await db.runAsync('DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?', playlistId, songId);
  await db.runAsync('UPDATE playlists SET dateModified = ? WHERE id = ?', Date.now(), playlistId);
}
