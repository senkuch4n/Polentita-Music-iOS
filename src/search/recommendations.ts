import type { SQLiteDatabase } from 'expo-sqlite';
import { getArtistSummaries } from '../db/artistsRepository';

// Android's explore/recommendations feed comes from a licensed-catalog
// backend this app doesn't have -- this is a from-scratch replacement:
// pick one of the user's own top artists (weighted toward whoever has the
// most songs) and search YouTube for it. New installs with an empty library
// fall back to a small curated seed list so the screen never looks broken
// on first launch.
const FALLBACK_SEEDS = ['lofi hip hop', 'pop 2024', 'rock clásico', 'reggaeton mix', 'jazz instrumental', 'indie folk'];

export async function pickRecommendationQuery(db: SQLiteDatabase): Promise<string> {
  const artists = await getArtistSummaries(db);
  if (artists.length === 0) {
    return FALLBACK_SEEDS[Math.floor(Math.random() * FALLBACK_SEEDS.length)];
  }
  // Weight by song count so prolific artists in the library surface more
  // often, without making it fully deterministic (top artist every time).
  const pool = artists.slice(0, Math.min(8, artists.length));
  const totalWeight = pool.reduce((sum, a) => sum + a.songCount, 0);
  let roll = Math.random() * totalWeight;
  for (const artist of pool) {
    roll -= artist.songCount;
    if (roll <= 0) return artist.name;
  }
  return pool[0].name;
}
