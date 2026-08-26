import type { SQLiteDatabase } from 'expo-sqlite';
import type { DocumentPickerAsset } from 'expo-document-picker';
import {
  findOrCreateImport,
  getImportById,
  getImportItemById,
  getImportItems,
  getItemCandidates,
  insertImportItems,
  replaceItemCandidates,
  selectCandidate,
  setItemSelected,
  updateImportState,
  updateItemState,
  type NewImportedTrack,
} from '../db/playlistImportRepository';
import { addSongsToPlaylist, createPlaylist } from '../db/playlistsRepository';
import { getAllSongs } from '../db/songsRepository';
import { downloadAudio, searchYoutube } from '../native/pythonBridge';
import { finalizeDownloadedSong } from '../downloads/finalizeDownload';
import { downloadsDirectory, ensureLibraryDirectories, toPosixPath } from '../library/paths';
import { buildSearchQuery } from './normalize';
import { isAmbiguous, localScore, rankCandidates } from './matcher';
import { analyzeFileAsset } from './providers/file';
import { analyzeSpotifyUrl, supportsSpotifyUrl } from './providers/spotify';
import { analyzeYoutubeUrl, supportsYoutubeUrl } from './providers/youtube';
import type { ImportItemState } from '../db/types';

const LOCAL_MATCH_THRESHOLD = 0.78;
const MAX_AUTOMATIC_CYCLES_PER_CANDIDATE = 2;
const PERMANENT_ERROR_MARKERS = [
  'copyright',
  'drm',
  'private video',
  'not available',
  'unsupported url',
  'age-restricted',
  'sign in',
  'no video formats',
];

function isPermanentError(message: string): boolean {
  const lower = message.toLowerCase();
  return PERMANENT_ERROR_MARKERS.some((marker) => lower.includes(marker));
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((l) => l());
}
export function subscribeImports(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- Analyze ----

export async function analyzeImportSource(
  db: SQLiteDatabase,
  input: { link?: string; file?: DocumentPickerAsset },
): Promise<number> {
  const collection = input.file
    ? await analyzeFileAsset(input.file)
    : await analyzeFromLink(input.link ?? '');

  const { record, isNew } = await findOrCreateImport(db, {
    source: collection.source,
    sourceId: collection.sourceId,
    sourceUrl: collection.sourceUrl,
    name: collection.name,
    description: collection.description,
    artworkUrl: collection.artworkUrl,
    owner: collection.owner,
    totalTracks: collection.tracks.length,
  });

  if (isNew) {
    const tracks: NewImportedTrack[] = collection.tracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationMs: t.durationMs,
      originalPosition: t.originalPosition,
      directVideoId: t.directMatch?.videoId ?? null,
      directUrl: t.directMatch?.webpageUrl ?? null,
      directThumbnail: t.directMatch?.thumbnail ?? null,
    }));
    await insertImportItems(db, record.id, tracks);
  }
  notify();
  void resolveMissing(db, record.id);
  return record.id;
}

async function analyzeFromLink(link: string) {
  const trimmed = link.trim();
  if (!trimmed) throw new Error('Pegá un enlace de Spotify o YouTube.');
  if (supportsSpotifyUrl(trimmed)) return analyzeSpotifyUrl(trimmed);
  if (supportsYoutubeUrl(trimmed)) return analyzeYoutubeUrl(trimmed);
  throw new Error('No reconocemos ese enlace. Probá con un enlace de Spotify, de YouTube, o elegí un archivo.');
}

// ---- Resolve (dedup against library, then search YouTube + score) ----

async function resolveMissing(db: SQLiteDatabase, importId: number): Promise<void> {
  const items = await getImportItems(db, importId);
  const librarySongs = await getAllSongs(db);

  for (const item of items) {
    if (item.state !== 'PENDING') continue;
    await updateItemState(db, item.id, 'SEARCHING');
    notify();

    const track: NewImportedTrack = {
      title: item.title,
      artist: item.artist,
      album: item.album,
      durationMs: item.durationMs,
      originalPosition: item.originalPosition,
    };

    const localMatches = librarySongs
      .map((song) => ({ song, score: localScore(track, song) }))
      .sort((a, b) => b.score - a.score);
    if (localMatches.length > 0 && localMatches[0].score >= LOCAL_MATCH_THRESHOLD) {
      console.log('[playlistImport] IN_LIBRARY', item.title, 'score', localMatches[0].score.toFixed(2), 'matched', localMatches[0].song.title);
      await updateItemState(db, item.id, 'IN_LIBRARY', { localSongId: localMatches[0].song.id });
      notify();
      continue;
    }

    // YouTube-sourced tracks already carry the exact video (inspect_playlist
    // resolved it, no ambiguity) -- skip search/matching entirely and queue
    // it directly, mirroring what a yt-dlp playlist download would do.
    if (item.directVideoId && item.directUrl) {
      await replaceItemCandidates(db, item.id, [
        {
          videoId: item.directVideoId,
          title: item.title,
          channel: item.artist,
          durationMs: item.durationMs,
          thumbnail: item.directThumbnail,
          webpageUrl: item.directUrl,
          score: 1,
          confidence: 'HIGH',
          rank: 0,
        },
      ]);
      const [directCandidate] = await getItemCandidates(db, item.id);
      await updateItemState(db, item.id, 'PROBABLE_MATCH', { selectedCandidateId: directCandidate.id });
      console.log('[playlistImport] direct-queue PROBABLE_MATCH', item.title, item.directUrl);
      notify();
      continue;
    }

    try {
      const query = buildSearchQuery(item.title, item.artist);
      const result = await searchYoutube(query, 0, 10);
      const ranked = rankCandidates(track, result.items);
      await replaceItemCandidates(
        db,
        item.id,
        ranked.map((r, index) => ({
          videoId: r.candidate.id,
          title: r.candidate.title,
          channel: r.candidate.channel,
          durationMs: r.candidate.durationMs,
          thumbnail: r.candidate.thumbnail || null,
          webpageUrl: r.candidate.webpageUrl,
          score: r.score,
          confidence: r.confidence,
          rank: index,
        })),
      );
      if (isAmbiguous(ranked)) {
        await updateItemState(db, item.id, 'REQUIRES_REVIEW');
      } else {
        const candidates = await getItemCandidates(db, item.id);
        await updateItemState(db, item.id, 'PROBABLE_MATCH', { selectedCandidateId: candidates[0].id });
      }
    } catch (error: any) {
      await updateItemState(db, item.id, 'REQUIRES_REVIEW', { errorMessage: error?.message ?? String(error) });
    }
    notify();
  }

  await updateImportState(db, importId, 'REVIEW');
  notify();
}

// ---- Review actions ----

export async function toggleItemSelected(db: SQLiteDatabase, itemId: number, selected: boolean): Promise<void> {
  await setItemSelected(db, itemId, selected);
  notify();
}

export async function pickItemCandidate(db: SQLiteDatabase, itemId: number, candidateId: number): Promise<void> {
  await selectCandidate(db, itemId, candidateId);
  notify();
}

export async function omitItem(db: SQLiteDatabase, itemId: number): Promise<void> {
  await updateItemState(db, itemId, 'OMITTED');
  notify();
}

// ---- Run (single-flight, mirrors downloadManager.ts's design) ----

let processing = false;

export async function startImport(db: SQLiteDatabase, importId: number, playlistName: string): Promise<void> {
  const record = await getImportById(db, importId);
  let localPlaylistId = record?.localPlaylistId ?? null;
  if (!localPlaylistId) {
    const playlist = await createPlaylist(db, playlistName, record?.description ?? '', record?.artworkUrl ?? null);
    localPlaylistId = playlist.id;
    await updateImportState(db, importId, 'RUNNING', { localPlaylistId });
  } else {
    await updateImportState(db, importId, 'RUNNING');
  }
  notify();
  void pump(db, importId);
}

export async function pauseImport(db: SQLiteDatabase, importId: number): Promise<void> {
  await updateImportState(db, importId, 'PAUSED');
  notify();
}

export async function resumeImport(db: SQLiteDatabase, importId: number): Promise<void> {
  await updateImportState(db, importId, 'RUNNING');
  notify();
  void pump(db, importId);
}

export async function cancelImport(db: SQLiteDatabase, importId: number): Promise<void> {
  await updateImportState(db, importId, 'CANCELLED');
  notify();
}

export async function retryImportErrors(db: SQLiteDatabase, importId: number): Promise<void> {
  const items = await getImportItems(db, importId);
  for (const item of items) {
    if (item.state === 'ERROR' || item.state === 'REQUIRES_REVIEW') {
      const nextState: ImportItemState = item.selectedCandidateId ? 'PROBABLE_MATCH' : 'REQUIRES_REVIEW';
      await updateItemState(db, item.id, nextState, { attemptCount: 0 });
    }
  }
  await resumeImport(db, importId);
}

async function pump(db: SQLiteDatabase, importId: number): Promise<void> {
  if (processing) return;
  const record = await getImportById(db, importId);
  if (!record || record.state !== 'RUNNING') return;

  const items = await getImportItems(db, importId);

  // Already-in-library matches need no download -- just link the existing
  // song into the new playlist. Handled as its own fast lane so it doesn't
  // wait behind whatever's currently downloading.
  const inLibraryItem = items.find((item) => item.selected && item.state === 'IN_LIBRARY' && item.localSongId);
  if (inLibraryItem) {
    await addSongsToPlaylist(db, record.localPlaylistId!, [inLibraryItem.localSongId!]);
    await updateItemState(db, inLibraryItem.id, 'COMPLETED');
    console.log('[playlistImport] linked already-owned song', inLibraryItem.title);
    notify();
    void pump(db, importId);
    return;
  }

  const next = items.find((item) => item.selected && item.state === 'PROBABLE_MATCH');
  if (!next) {
    const stillPending = items.some(
      (item) => item.selected && (item.state === 'REQUIRES_REVIEW' || item.state === 'ERROR'),
    );
    console.log(
      '[playlistImport] pump: nothing left to process, states=',
      items.map((i) => `${i.title}:${i.state}`).join(', '),
    );
    await updateImportState(db, importId, stillPending ? 'PARTIAL' : 'COMPLETED', { completed: true });
    notify();
    return;
  }

  processing = true;
  try {
    await processItem(db, record.localPlaylistId!, next.id);
  } finally {
    processing = false;
    notify();
    void pump(db, importId);
  }
}

async function processItem(db: SQLiteDatabase, localPlaylistId: number, itemId: number): Promise<void> {
  const candidates = await getItemCandidates(db, itemId);
  const item = await getImportItemById(db, itemId);
  if (!item?.selectedCandidateId) {
    await updateItemState(db, itemId, 'REQUIRES_REVIEW');
    return;
  }
  const candidate = candidates.find((c) => c.id === item.selectedCandidateId);
  if (!candidate) {
    await updateItemState(db, itemId, 'REQUIRES_REVIEW');
    return;
  }

  await updateItemState(db, itemId, 'DOWNLOADING');
  notify();
  console.log('[playlistImport] downloading', item.title, candidate.webpageUrl);

  try {
    ensureLibraryDirectories();
    const media = await downloadAudio(candidate.webpageUrl, toPosixPath(downloadsDirectory.uri));
    const song = await finalizeDownloadedSong(db, media);
    await addSongsToPlaylist(db, localPlaylistId, [song.id]);
    await updateItemState(db, itemId, 'COMPLETED', { localSongId: song.id });
    console.log('[playlistImport] COMPLETED', item.title, '-> song', song.id);
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const attemptCount = item.attemptCount + 1;
    const permanent = isPermanentError(message);
    console.log('[playlistImport] FAILED', item.title, message, 'permanent=', permanent, 'attempt=', attemptCount);

    if (!permanent && attemptCount < MAX_AUTOMATIC_CYCLES_PER_CANDIDATE) {
      await updateItemState(db, itemId, 'PROBABLE_MATCH', { attemptCount, errorMessage: message });
      return;
    }

    const currentRank = candidate.rank;
    const nextCandidate = candidates.find((c) => c.rank === currentRank + 1);
    if (nextCandidate) {
      await updateItemState(db, itemId, 'PROBABLE_MATCH', {
        selectedCandidateId: nextCandidate.id,
        attemptCount: 0,
        errorMessage: message,
      });
    } else {
      await updateItemState(db, itemId, 'REQUIRES_REVIEW', { errorMessage: message, attemptCount });
    }
  }
}

// ---- Recovery after app restart ----

let recovered = false;

export async function recoverImportsAfterRestart(db: SQLiteDatabase): Promise<void> {
  if (recovered) return;
  recovered = true;
  await db.runAsync("UPDATE playlist_import_items SET state = 'REQUIRES_REVIEW' WHERE state = 'SEARCHING'");
  await db.runAsync("UPDATE playlist_import_items SET state = 'PROBABLE_MATCH' WHERE state = 'DOWNLOADING'");
  const running = await db.getAllAsync<{ id: number }>("SELECT id FROM playlist_imports WHERE state = 'RUNNING'");
  for (const row of running) void pump(db, row.id);
}
