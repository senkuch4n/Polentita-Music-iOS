import { inspectPlaylist } from '../../native/pythonBridge';
import type { ImportedCollection } from './types';

const URL_PATTERN = /(?:music\.)?youtube\.com\/playlist\?[^#]*\blist=([a-zA-Z0-9_-]+)/i;

export function supportsYoutubeUrl(url: string): boolean {
  return URL_PATTERN.test(url);
}

export async function analyzeYoutubeUrl(url: string): Promise<ImportedCollection> {
  const match = url.match(URL_PATTERN);
  if (!match) throw new Error('El enlace no corresponde a una playlist de YouTube');

  // Share-sheet text often prepends a title/description before the actual
  // link (e.g. "Kiss All The Time... https://music.youtube.com/playlist?list=...&feature=share")
  // -- rebuild a clean URL from the matched id instead of passing the raw
  // pasted text straight to yt-dlp.
  const playlistId = match[1];
  const canonicalUrl = `https://music.youtube.com/playlist?list=${playlistId}`;

  const playlist = await inspectPlaylist(canonicalUrl);
  if (playlist.entries.length === 0) throw new Error('La playlist de YouTube parece estar vacía.');

  return {
    source: 'youtube',
    sourceId: playlistId,
    sourceUrl: playlist.webpageUrl || canonicalUrl,
    name: playlist.title || 'Playlist de YouTube',
    description: playlist.description,
    artworkUrl: playlist.thumbnail || null,
    owner: null,
    tracks: playlist.entries.map((entry, index) => ({
      title: entry.title,
      artist: entry.artist,
      album: entry.album,
      durationMs: entry.durationMs,
      originalPosition: index,
      directMatch: {
        videoId: entry.id,
        webpageUrl: entry.webpageUrl,
        thumbnail: entry.thumbnail || null,
      },
    })),
  };
}
