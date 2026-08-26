import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  ImportItemState,
  ImportSource,
  ImportState,
  MatchConfidence,
  PlaylistImport,
  PlaylistImportCandidate,
  PlaylistImportItem,
} from './types';

function rowToImport(row: any): PlaylistImport {
  return { ...row };
}
function rowToItem(row: any): PlaylistImportItem {
  return { ...row, selected: !!row.selected };
}
function rowToCandidate(row: any): PlaylistImportCandidate {
  return { ...row };
}

export interface NewImportedTrack {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  originalPosition: number;
  directVideoId?: string | null;
  directUrl?: string | null;
  directThumbnail?: string | null;
}

export interface NewCandidate {
  videoId: string;
  title: string;
  channel: string;
  durationMs: number;
  thumbnail: string | null;
  webpageUrl: string;
  score: number;
  confidence: MatchConfidence;
  rank: number;
}

// Re-analyzing the same link/file resolves to the existing import row
// instead of duplicating it (mirrors android-source's unique (source, sourceId)).
export async function findOrCreateImport(
  db: SQLiteDatabase,
  fields: {
    source: ImportSource;
    sourceId: string;
    sourceUrl: string | null;
    name: string;
    description: string;
    artworkUrl: string | null;
    owner: string | null;
    totalTracks: number;
  },
): Promise<{ record: PlaylistImport; isNew: boolean }> {
  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM playlist_imports WHERE source = ? AND sourceId = ?',
    fields.source,
    fields.sourceId,
  );
  if (existing) return { record: rowToImport(existing), isNew: false };

  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO playlist_imports
      (source, sourceId, sourceUrl, name, description, artworkUrl, owner, totalTracks, state, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ANALYZED', ?, ?)`,
    fields.source,
    fields.sourceId,
    fields.sourceUrl,
    fields.name,
    fields.description,
    fields.artworkUrl,
    fields.owner,
    fields.totalTracks,
    now,
    now,
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM playlist_imports WHERE id = ?', result.lastInsertRowId);
  return { record: rowToImport(row), isNew: true };
}

export async function insertImportItems(db: SQLiteDatabase, importId: number, tracks: NewImportedTrack[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const track of tracks) {
      await db.runAsync(
        `INSERT INTO playlist_import_items
          (importId, title, artist, album, durationMs, originalPosition, selected, state, directVideoId, directUrl, directThumbnail)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'PENDING', ?, ?, ?)`,
        importId,
        track.title,
        track.artist,
        track.album,
        track.durationMs,
        track.originalPosition,
        track.directVideoId ?? null,
        track.directUrl ?? null,
        track.directThumbnail ?? null,
      );
    }
  });
}

export async function getImportById(db: SQLiteDatabase, id: number): Promise<PlaylistImport | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM playlist_imports WHERE id = ?', id);
  return row ? rowToImport(row) : null;
}

export async function getAllImports(db: SQLiteDatabase): Promise<PlaylistImport[]> {
  const rows = await db.getAllAsync<any>('SELECT * FROM playlist_imports ORDER BY createdAt DESC');
  return rows.map(rowToImport);
}

export async function getImportItems(db: SQLiteDatabase, importId: number): Promise<PlaylistImportItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM playlist_import_items WHERE importId = ? ORDER BY originalPosition ASC',
    importId,
  );
  return rows.map(rowToItem);
}

export async function getImportItemById(db: SQLiteDatabase, itemId: number): Promise<PlaylistImportItem | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM playlist_import_items WHERE id = ?', itemId);
  return row ? rowToItem(row) : null;
}

export async function getItemCandidates(db: SQLiteDatabase, itemId: number): Promise<PlaylistImportCandidate[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM playlist_import_candidates WHERE itemId = ? ORDER BY rank ASC',
    itemId,
  );
  return rows.map(rowToCandidate);
}

export async function replaceItemCandidates(db: SQLiteDatabase, itemId: number, candidates: NewCandidate[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM playlist_import_candidates WHERE itemId = ?', itemId);
    for (const c of candidates) {
      await db.runAsync(
        `INSERT INTO playlist_import_candidates
          (itemId, videoId, title, channel, durationMs, thumbnail, webpageUrl, score, confidence, rank)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        itemId,
        c.videoId,
        c.title,
        c.channel,
        c.durationMs,
        c.thumbnail,
        c.webpageUrl,
        c.score,
        c.confidence,
        c.rank,
      );
    }
  });
}

export async function updateItemState(
  db: SQLiteDatabase,
  itemId: number,
  state: ImportItemState,
  patch?: { errorMessage?: string | null; localSongId?: number | null; selectedCandidateId?: number | null; attemptCount?: number },
): Promise<void> {
  await db.runAsync(
    `UPDATE playlist_import_items SET
      state = ?,
      errorMessage = COALESCE(?, errorMessage),
      localSongId = COALESCE(?, localSongId),
      selectedCandidateId = CASE WHEN ? IS NOT NULL THEN ? ELSE selectedCandidateId END,
      attemptCount = COALESCE(?, attemptCount)
     WHERE id = ?`,
    state,
    patch?.errorMessage ?? null,
    patch?.localSongId ?? null,
    patch?.selectedCandidateId ?? null,
    patch?.selectedCandidateId ?? null,
    patch?.attemptCount ?? null,
    itemId,
  );
}

export async function setItemSelected(db: SQLiteDatabase, itemId: number, selected: boolean): Promise<void> {
  await db.runAsync('UPDATE playlist_import_items SET selected = ? WHERE id = ?', selected ? 1 : 0, itemId);
}

export async function selectCandidate(db: SQLiteDatabase, itemId: number, candidateId: number): Promise<void> {
  await db.runAsync(
    "UPDATE playlist_import_items SET selectedCandidateId = ?, state = 'PROBABLE_MATCH' WHERE id = ?",
    candidateId,
    itemId,
  );
}

export async function updateImportState(
  db: SQLiteDatabase,
  importId: number,
  state: ImportState,
  patch?: { errorMessage?: string | null; localPlaylistId?: number | null; completed?: boolean },
): Promise<void> {
  await db.runAsync(
    `UPDATE playlist_imports SET
      state = ?,
      updatedAt = ?,
      errorMessage = COALESCE(?, errorMessage),
      localPlaylistId = COALESCE(?, localPlaylistId),
      completedAt = CASE WHEN ? = 1 THEN ? ELSE completedAt END
     WHERE id = ?`,
    state,
    Date.now(),
    patch?.errorMessage ?? null,
    patch?.localPlaylistId ?? null,
    patch?.completed ? 1 : 0,
    Date.now(),
    importId,
  );
}

export async function deleteImport(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM playlist_imports WHERE id = ?', id);
}
