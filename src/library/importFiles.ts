import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { parseBuffer } from 'music-metadata';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { findOrCreateAlbum } from '../db/albumsRepository';
import { findSongByChecksum, insertSong } from '../db/songsRepository';
import type { Song } from '../db/types';
import { coversDirectory, ensureLibraryDirectories, musicDirectory, sanitizeFileName } from './paths';

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const PICTURE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

async function extractCover(songChecksum: string, picture?: { format: string; data: Uint8Array }): Promise<string | null> {
  if (!picture) return null;
  const ext = PICTURE_EXTENSION[picture.format] ?? 'jpg';
  const coverFile = new File(coversDirectory, `${songChecksum}.${ext}`);
  if (!coverFile.exists) {
    coverFile.write(picture.data);
  }
  return coverFile.uri;
}

export interface ImportResult {
  imported: Song[];
  duplicates: number;
  failed: { name: string; error: string }[];
}

export async function importPickedFiles(
  db: SQLiteDatabase,
  assets: DocumentPickerAsset[],
): Promise<ImportResult> {
  ensureLibraryDirectories();

  const imported: Song[] = [];
  const failed: ImportResult['failed'] = [];
  let duplicates = 0;

  for (const asset of assets) {
    try {
      const source = new File(asset.uri);
      const bytes = await source.bytes();
      const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
      const checksum = bytesToHex(digest);

      const existing = await findSongByChecksum(db, checksum);
      if (existing) {
        duplicates += 1;
        continue;
      }

      // Resolve the parser by file extension, not MIME-type: music-metadata's
      // MIME-type path goes through Node-oriented `content-type`/`media-typer`
      // packages that fail silently under Hermes, which throws
      // "Guessed MIME-type not supported" even for common formats like m4a.
      const metadata = await parseBuffer(bytes, { path: asset.name });
      const common = metadata.common;
      const format = metadata.format;

      const originalFileName = asset.name;
      const displayFileName = `${checksum.slice(0, 8)}_${sanitizeFileName(originalFileName)}`;
      const destination = new File(musicDirectory, displayFileName);
      source.copy(destination);

      const coverUri = await extractCover(checksum, common.picture?.[0]);

      const album = common.album
        ? await findOrCreateAlbum(db, common.album, common.albumartist ?? common.artist ?? '', common.year ?? null, coverUri)
        : null;

      const song = await insertSong(db, {
        title: common.title ?? originalFileName.replace(/\.[^/.]+$/, ''),
        artist: common.artist ?? '',
        albumId: album?.id ?? null,
        albumName: common.album ?? '',
        genre: common.genre?.[0] ?? '',
        year: common.year ?? null,
        trackNumber: common.track?.no ?? null,
        discNumber: common.disk?.no ?? null,
        durationMs: format.duration ? Math.round(format.duration * 1000) : 0,
        contentUri: destination.uri,
        originalFileName,
        displayFileName,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        fileSize: asset.size ?? destination.size ?? 0,
        coverUri,
        sourceType: 'IMPORTED',
        checksum,
      });
      imported.push(song);
    } catch (error) {
      failed.push({ name: asset.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { imported, duplicates, failed };
}
