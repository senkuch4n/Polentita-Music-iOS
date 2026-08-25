// Ported from the Android app's Room schema (android-source/.../core/database/Entities.kt).
// playback_history is included since Home's "recent/most played" needs it; the
// YouTube-related tables (downloads, remote_references, playlist_import*) are added
// when that feature is built (project plan step 4/5), not before.

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  year INTEGER,
  coverUri TEXT,
  dateCreated INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS index_albums_name_artist ON albums(name, artist);
CREATE INDEX IF NOT EXISTS index_albums_dateCreated ON albums(dateCreated);

CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  albumId INTEGER REFERENCES albums(id) ON DELETE SET NULL ON UPDATE CASCADE,
  albumName TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  year INTEGER,
  trackNumber INTEGER,
  discNumber INTEGER,
  durationMs INTEGER NOT NULL DEFAULT 0,
  contentUri TEXT NOT NULL,
  originalFileName TEXT NOT NULL,
  displayFileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  fileSize INTEGER NOT NULL DEFAULT 0,
  coverUri TEXT,
  sourceType TEXT NOT NULL DEFAULT 'IMPORTED',
  sourceUrl TEXT,
  dateAdded INTEGER NOT NULL,
  dateModified INTEGER NOT NULL,
  lastPlayedAt INTEGER,
  playCount INTEGER NOT NULL DEFAULT 0,
  isFavorite INTEGER NOT NULL DEFAULT 0,
  isAvailable INTEGER NOT NULL DEFAULT 1,
  checksum TEXT NOT NULL,
  isrc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS index_songs_contentUri ON songs(contentUri);
CREATE INDEX IF NOT EXISTS index_songs_checksum ON songs(checksum);
CREATE INDEX IF NOT EXISTS index_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS index_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS index_songs_albumId ON songs(albumId);
CREATE INDEX IF NOT EXISTS index_songs_dateAdded ON songs(dateAdded);
CREATE INDEX IF NOT EXISTS index_songs_playCount ON songs(playCount);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  coverUri TEXT,
  dateCreated INTEGER NOT NULL,
  dateModified INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS index_playlists_name ON playlists(name);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlistId INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE CASCADE,
  songId INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position INTEGER NOT NULL,
  dateAdded INTEGER NOT NULL,
  PRIMARY KEY (playlistId, songId)
);
CREATE INDEX IF NOT EXISTS index_playlist_songs_songId ON playlist_songs(songId);
CREATE UNIQUE INDEX IF NOT EXISTS index_playlist_songs_playlistId_position ON playlist_songs(playlistId, position);

CREATE TABLE IF NOT EXISTS playback_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  songId INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  playedAt INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  playbackPositionMs INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS index_playback_history_songId ON playback_history(songId);
CREATE INDEX IF NOT EXISTS index_playback_history_playedAt ON playback_history(playedAt);
`;

export const DATABASE_NAME = 'polentita.db';
