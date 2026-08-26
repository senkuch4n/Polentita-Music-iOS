import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ImportedCollection, ImportedTrack } from './types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function parseDuration(value: unknown): number {
  if (typeof value === 'number') return value > 10000 ? Math.round(value) : Math.round(value * 1000);
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d+):(\d{2})$/);
  if (timeMatch) return (parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10)) * 1000;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return numeric > 10000 ? Math.round(numeric) : Math.round(numeric * 1000);
  return 0;
}

function pick(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function parseJson(text: string): ImportedTrack[] {
  const data = JSON.parse(text);
  const rows: any[] = Array.isArray(data) ? data : data.tracks ?? data.items ?? [];
  return rows.map((row, index) => ({
    title: pick(row, ['title', 'name']),
    artist: Array.isArray(row.artists) ? row.artists.join(', ') : pick(row, ['artist', 'artists']),
    album: pick(row, ['album']),
    durationMs: parseDuration(row.durationMs ?? row.duration_ms ?? row.duration),
    originalPosition: index,
  })).filter((t) => t.title);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

const HEADER_ALIASES: Record<string, string[]> = {
  title: ['title', 'titulo', 'título', 'track', 'song', 'name', 'nombre'],
  artist: ['artist', 'artista', 'artists', 'artistas'],
  album: ['album', 'álbum'],
  duration: ['duration', 'duracion', 'duración', 'durationms', 'duration_ms'],
};

function parseCsv(text: string): ImportedTrack[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const indexFor = (field: keyof typeof HEADER_ALIASES) =>
    headers.findIndex((h) => HEADER_ALIASES[field].includes(h));
  const titleIdx = indexFor('title');
  const artistIdx = indexFor('artist');
  const albumIdx = indexFor('album');
  const durationIdx = indexFor('duration');
  if (titleIdx === -1) throw new Error('El CSV necesita una columna de título.');

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    return {
      title: cells[titleIdx] ?? '',
      artist: artistIdx >= 0 ? cells[artistIdx] ?? '' : '',
      album: albumIdx >= 0 ? cells[albumIdx] ?? '' : '',
      durationMs: durationIdx >= 0 ? parseDuration(cells[durationIdx]) : 0,
      originalPosition: index,
    };
  }).filter((t) => t.title);
}

function parseTxt(text: string): { name: string | null; tracks: ImportedTrack[] } {
  const lines = text.split(/\r?\n/);
  let name: string | null = null;
  const trackLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const nameMatch = trimmed.match(/^#\s*name:\s*(.+)$/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
      continue;
    }
    if (trimmed.startsWith('#')) continue;
    trackLines.push(trimmed);
  }
  const delimiter = trackLines[0]?.includes('\t') ? '\t' : '|';
  const tracks = trackLines.map((line, index) => {
    const parts = line.split(delimiter).map((p) => p.trim());
    return {
      title: parts[1] ?? parts[0] ?? '',
      artist: parts.length > 1 ? parts[0] : '',
      album: parts[2] ?? '',
      durationMs: 0,
      originalPosition: index,
    };
  }).filter((t) => t.title);
  return { name, tracks };
}

export async function analyzeFileAsset(asset: DocumentPickerAsset): Promise<ImportedCollection> {
  if (asset.size && asset.size > MAX_FILE_SIZE) {
    throw new Error('El archivo es demasiado grande (máx. 5 MB).');
  }
  const file = new File(asset.uri);
  const text = await file.text();
  const extension = (asset.name.split('.').pop() ?? '').toLowerCase();

  let tracks: ImportedTrack[];
  let name = asset.name.replace(/\.[^.]+$/, '');

  if (extension === 'json') {
    tracks = parseJson(text);
  } else if (extension === 'csv') {
    tracks = parseCsv(text);
  } else {
    const parsed = parseTxt(text);
    tracks = parsed.tracks;
    if (parsed.name) name = parsed.name;
  }

  if (tracks.length === 0) throw new Error('No se encontraron canciones en el archivo.');

  return {
    source: 'file',
    sourceId: `${asset.name}-${asset.size ?? tracks.length}`,
    sourceUrl: null,
    name,
    description: '',
    artworkUrl: null,
    owner: null,
    tracks: tracks.map((t, index) => ({ ...t, originalPosition: index })),
  };
}
