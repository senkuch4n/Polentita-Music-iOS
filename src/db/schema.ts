// Ported from the Android app's Room schema (android-source/.../core/database/Entities.kt).
// playback_history is included since Home's "recent/most played" needs it. `downloads`
// was added for project plan step 4 (PythonBridge/yt-dlp search+download); the
// remaining YouTube-related tables (remote_references, playlist_import*) are still
// deferred until playlist import (step 5) is built.
//
// `downloads` deliberately has no direct Android equivalent to port 1:1: Android's
// DownloadEntity is generic across a licensed-catalog "direct" provider and yt-dlp: the
// iOS Python bridge only ever downloads via yt-dlp, so this is a smaller, yt-dlp-only
// shape (videoId/sourceUrl instead of providerId, no separate remote_references row).

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

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sourceUrl TEXT NOT NULL,
  videoId TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  thumbnail TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  bytesDownloaded INTEGER NOT NULL DEFAULT 0,
  totalBytes INTEGER NOT NULL DEFAULT -1,
  errorMessage TEXT,
  songId INTEGER REFERENCES songs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  createdAt INTEGER NOT NULL,
  completedAt INTEGER
);
CREATE INDEX IF NOT EXISTS index_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS index_downloads_createdAt ON downloads(createdAt);

-- "Save for later" bookmarks on Search results (mirrors android-source's
-- remote_references, minus the licensed-provider fields it also carries
-- that don't apply here -- this app only ever searches YouTube).
CREATE TABLE IF NOT EXISTS saved_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sourceUrl TEXT NOT NULL UNIQUE,
  videoId TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT '',
  thumbnail TEXT,
  durationMs INTEGER NOT NULL DEFAULT 0,
  savedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS index_saved_references_savedAt ON saved_references(savedAt);
`;

export const DATABASE_NAME = 'polentita.db';
