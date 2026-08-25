import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { findOrCreateAlbum } from '../db/albumsRepository';
import { findSongByChecksum, insertSong } from '../db/songsRepository';
import type { Song } from '../db/types';
import type { MediaInfo } from '../native/pythonBridge';
import { musicDirectory, sanitizeFileName, toFileUri } from '../library/paths';

const EXTENSION_MIME: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  opus: 'audio/opus',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
};

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Turns a completed yt-dlp download (already on disk under downloadsDirectory,
// per MediaInfo.path) into a library Song -- mirrors library/importFiles.ts's
// picked-file flow, substituting the Python-downloaded file as the source
// instead of a DocumentPicker asset. Hashing (rather than trusting the
// videoId) catches the case where the same track was already imported from a
// local file or downloaded previously under a different video id.
export async function finalizeDownloadedSong(db: SQLiteDatabase, media: MediaInfo): Promise<Song> {
  const source = new File(toFileUri(media.path));
  const bytes = await source.bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const checksum = bytesToHex(digest);

  const existing = await findSongByChecksum(db, checksum);
  if (existing) {
    source.delete();
    return existing;
  }

  const extension = media.extension || source.extension.replace(/^\./, '') || 'm4a';
  const baseName = sanitizeFileName(media.title || media.id || 'audio');
  const displayFileName = `${checksum.slice(0, 8)}_${baseName}.${extension}`;
  const destination = new File(musicDirectory, displayFileName);
  source.move(destination);

  const album = media.album
    ? await findOrCreateAlbum(db, media.album, media.artist, null, null)
    : null;

  return insertSong(db, {
    title: media.title || 'Audio',
    artist: media.artist || '',
    albumId: album?.id ?? null,
    albumName: media.album || '',
    genre: '',
    year: null,
    trackNumber: null,
    discNumber: null,
    durationMs: media.durationMs,
    contentUri: destination.uri,
    originalFileName: source.name,
    displayFileName,
    mimeType: EXTENSION_MIME[extension] ?? 'audio/mp4',
    fileSize: media.sizeBytes > 0 ? media.sizeBytes : destination.size ?? 0,
    coverUri: media.thumbnail || null,
    sourceType: 'DOWNLOADED',
    sourceUrl: media.webpageUrl || null,
    checksum,
  });
}
