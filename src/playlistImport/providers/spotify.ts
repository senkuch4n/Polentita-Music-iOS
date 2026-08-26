// Ported from android-source's SpotifyPlaylistImportProvider +
// PublicPlaylistPageParser -- scrapes Spotify's *public* playlist/album
// page (no login, no API key: the same JSON Spotify embeds in the page for
// any visitor), not the real Spotify Web API. See project memory
// "project-playlist-import-next" for why this needs no credentials.
import { base64ToUtf8 } from '../../utils/base64';
import type { ImportedCollection, ImportedTrack } from './types';

const PAGE_SIZE = 100;
const URL_PATTERN = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album)\/([a-zA-Z0-9]+)/i;

export function supportsSpotifyUrl(url: string): boolean {
  return URL_PATTERN.test(url);
}

interface SpotifyReference {
  type: 'playlist' | 'album';
  sourceId: string;
  canonicalUrl: string;
}

function parseReference(url: string): SpotifyReference | null {
  const match = url.match(URL_PATTERN);
  if (!match) return null;
  const type = match[1].toLowerCase() as 'playlist' | 'album';
  const sourceId = match[2];
  return { type, sourceId, canonicalUrl: `https://open.spotify.com/${type}/${sourceId}` };
}

function extractScriptById(html: string, id: string): string | null {
  const pattern = new RegExp(`<script[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, 'i');
  const match = html.match(pattern);
  return match ? match[1] : null;
}

function extractMeta(html: string, property: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  );
  const match = html.match(pattern);
  return (match?.[1] || match?.[2] || null)?.trim() || null;
}

function firstArtwork(value: any): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstArtwork(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const nested = firstArtwork(value.sources);
    if (nested) return nested;
    if (typeof value.url === 'string' && value.url.startsWith('https://')) return value.url;
  }
  return null;
}

function parseArtists(artistsObject: any): string {
  const items = artistsObject?.items;
  if (!Array.isArray(items)) return '';
  const names: string[] = [];
  for (const artist of items) {
    const name = (artist?.profile?.name ?? artist?.name ?? '').trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

interface SpotifyPage {
  name: string;
  description: string;
  artworkUrl: string | null;
  owner: string | null;
  totalTracks: number;
  tracks: ImportedTrack[];
  nextOffset: number | null;
}

async function loadPage(reference: SpotifyReference, offset: number | null): Promise<SpotifyPage> {
  const url = offset != null ? `${reference.canonicalUrl}?offset=${offset}&limit=${PAGE_SIZE}` : reference.canonicalUrl;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error('No se pudo abrir la playlist de Spotify (¿es pública?)');
  const html = await response.text();

  const encoded = extractScriptById(html, 'initialState');
  if (!encoded) throw new Error('Spotify no devolvió los datos esperados. Probá con otro enlace.');
  let state: any;
  try {
    state = JSON.parse(base64ToUtf8(encoded));
  } catch {
    throw new Error('No se pudo leer la respuesta de Spotify.');
  }

  const items = state?.entities?.items;
  if (!items || typeof items !== 'object') throw new Error('Spotify no devolvió los datos esperados.');
  const expectedKey = `spotify:${reference.type}:${reference.sourceId}`;
  let entity = items[expectedKey];
  if (!entity) {
    entity = Object.values(items).find((value: any) => value?.id === reference.sourceId);
  }
  if (!entity) throw new Error('No se encontró la playlist en la respuesta de Spotify.');

  const page = entity.content ?? entity.tracksV2;
  const totalTracks: number = page?.totalCount ?? 0;
  const tracksJson: any[] = page?.items ?? [];
  if (!page || totalTracks <= 0) throw new Error('La playlist de Spotify parece estar vacía o no es pública.');

  const collectionArtwork = firstArtwork(entity.images) ?? firstArtwork(entity.coverArt) ?? extractMeta(html, 'og:image');
  const collectionName = (entity.name ?? '').trim() || extractMeta(html, 'og:title') || 'Colección de Spotify';
  const description = (entity.description ?? '').trim() || extractMeta(html, 'og:description') || '';
  const owner = (entity.ownerV2?.data?.name ?? '').trim() || null;
  const albumName = reference.type === 'album' ? collectionName : '';

  const tracks: ImportedTrack[] = [];
  for (const wrapper of tracksJson) {
    const track = wrapper?.itemV2?.data ?? wrapper?.track ?? wrapper?.item;
    if (!track) continue;
    const title = (track.name ?? '').trim();
    if (!title) continue;
    const artist = parseArtists(track.artists);
    const trackAlbum = (track.albumOfTrack?.name ?? '').trim() || albumName;
    const durationMs = Math.max(0, track.duration?.totalMilliseconds ?? 0);
    tracks.push({ title, artist, album: trackAlbum, durationMs, originalPosition: 0 });
  }

  const nextOffset = page?.pagingInfo?.nextOffset;
  return {
    name: collectionName,
    description,
    artworkUrl: collectionArtwork,
    owner,
    totalTracks,
    tracks,
    nextOffset: typeof nextOffset === 'number' && nextOffset >= 0 ? nextOffset : null,
  };
}

export async function analyzeSpotifyUrl(url: string): Promise<ImportedCollection> {
  const reference = parseReference(url);
  if (!reference) throw new Error('El enlace no corresponde a una playlist o álbum de Spotify');

  const firstPage = await loadPage(reference, null);
  const tracks = [...firstPage.tracks];
  const visitedOffsets = new Set<number>();
  let nextOffset = firstPage.nextOffset;

  while (nextOffset != null && tracks.length < firstPage.totalTracks) {
    if (visitedOffsets.has(nextOffset)) break;
    visitedOffsets.add(nextOffset);
    let page: SpotifyPage;
    try {
      page = await loadPage(reference, nextOffset);
    } catch {
      // Spotify sometimes exposes the first public window but denies later
      // ones -- keep what we already have instead of failing the import.
      break;
    }
    if (page.tracks.length === 0) break;
    tracks.push(...page.tracks);
    nextOffset = page.nextOffset;
  }

  if (tracks.length === 0) throw new Error('No se encontraron canciones en esta playlist de Spotify.');

  return {
    source: 'spotify',
    sourceId: reference.sourceId,
    sourceUrl: reference.canonicalUrl,
    name: firstPage.name,
    description: firstPage.description,
    artworkUrl: firstPage.artworkUrl,
    owner: firstPage.owner,
    tracks: tracks.map((track, index) => ({ ...track, originalPosition: index })),
  };
}
