import type { SQLiteDatabase } from 'expo-sqlite';

// There's no `artists` table (mirrors android-source: artists are a derived
// view over songs.artist, not a first-class entity) -- grouped here instead.
export interface ArtistSummary {
  name: string;
  songCount: number;
  totalDurationMs: number;
  coverUri: string | null;
}

export async function getArtistSummaries(db: SQLiteDatabase, search = ''): Promise<ArtistSummary[]> {
  const trimmed = search.trim();
  const base = `SELECT
      artist as name,
      COUNT(*) as songCount,
      SUM(durationMs) as totalDurationMs,
      MIN(coverUri) as coverUri
    FROM songs
    WHERE isAvailable = 1 AND artist != ''`;
  if (trimmed) {
    const like = `%${trimmed}%`;
    return db.getAllAsync<ArtistSummary>(
      `${base} AND artist LIKE ? COLLATE NOCASE GROUP BY artist COLLATE NOCASE ORDER BY artist COLLATE NOCASE ASC`,
      like,
    );
  }
  return db.getAllAsync<ArtistSummary>(`${base} GROUP BY artist COLLATE NOCASE ORDER BY artist COLLATE NOCASE ASC`);
}
