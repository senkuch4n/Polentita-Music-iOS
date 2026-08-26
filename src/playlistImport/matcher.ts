// Scoring/ranking -- ported from android-source's PlaylistImportMatcher.kt
// (exact weights/thresholds kept identical; only the candidate source
// differs: YouTube search results here instead of a licensed catalog).
import { detectVersionMarkers, normalizeArtists, normalizeText, tokenSimilarity } from './normalize';
import type { MatchConfidence } from '../db/types';
import type { SearchResultItem } from '../native/pythonBridge';
import type { NewImportedTrack } from '../db/playlistImportRepository';

const AMBIGUITY_SCORE_THRESHOLD = 0.78;
const AMBIGUITY_GAP_THRESHOLD = 0.08;
const VERSION_MISMATCH_PENALTY_LOCAL = 0.3;
const VERSION_MISMATCH_PENALTY_REMOTE = 0.36;

function versionPenalty(a: string, b: string, penalty: number): number {
  const markersA = detectVersionMarkers(a);
  const markersB = detectVersionMarkers(b);
  const union = new Set([...markersA, ...markersB]);
  if (union.size === 0) return 0;
  for (const marker of union) {
    if (markersA.has(marker) !== markersB.has(marker)) return penalty;
  }
  return 0;
}

function durationCompatibleLocal(expectedMs: number, actualMs: number): number {
  if (expectedMs <= 0 || actualMs <= 0) return 0;
  const tolerance = Math.max(4000, expectedMs * 0.03);
  return Math.abs(expectedMs - actualMs) <= tolerance ? 1 : 0;
}

function durationScoreRemote(expectedMs: number, actualMs: number): number {
  if (expectedMs <= 0 || actualMs <= 0) return 0;
  const diff = Math.abs(expectedMs - actualMs);
  if (diff === 0) return 1;
  return Math.max(0, 1 - diff / 60000);
}

export interface LocalMatchTarget {
  title: string;
  artist: string;
  albumName: string;
  durationMs: number;
}

// Dedup against the library before ever hitting the network -- if the track
// is already imported/downloaded, skip straight to IN_LIBRARY.
export function localScore(track: NewImportedTrack, song: LocalMatchTarget): number {
  const titleExact = normalizeText(track.title) === normalizeText(song.title);
  const artistExact = normalizeArtists(track.artist) === normalizeArtists(song.artist);
  const versionsMatch = versionPenalty(track.title, song.title, 1) === 0;
  if (titleExact && artistExact && versionsMatch) {
    const albumExact = normalizeText(track.album) === normalizeText(song.albumName);
    const durationExact = durationCompatibleLocal(track.durationMs, song.durationMs) === 1;
    if (albumExact && durationExact) return 0.96;
    return 0.98;
  }

  const titleSim = tokenSimilarity(track.title, song.title);
  const artistSim = tokenSimilarity(track.artist, song.artist);
  const albumSim = tokenSimilarity(track.album, song.albumName);
  const durationSim = durationCompatibleLocal(track.durationMs, song.durationMs);
  const penalty = versionPenalty(track.title, song.title, VERSION_MISMATCH_PENALTY_LOCAL);

  return Math.max(0, titleSim * 0.48 + artistSim * 0.3 + albumSim * 0.08 + durationSim * 0.14 - penalty);
}

export function remoteScore(track: NewImportedTrack, candidate: SearchResultItem): number {
  const titleSim = tokenSimilarity(track.title, candidate.title);
  const artistSim = tokenSimilarity(track.artist, candidate.channel);
  const durationSim = durationScoreRemote(track.durationMs, candidate.durationMs);
  const penalty = versionPenalty(track.title, candidate.title, VERSION_MISMATCH_PENALTY_REMOTE);

  return Math.max(0, titleSim * 0.58 + artistSim * 0.27 + durationSim * 0.15 - penalty);
}

export function confidenceFor(score: number): MatchConfidence {
  if (score >= 0.88) return 'HIGH';
  if (score >= 0.72) return 'MEDIUM';
  return 'LOW';
}

export interface RankedCandidate {
  candidate: SearchResultItem;
  score: number;
  confidence: MatchConfidence;
}

export function rankCandidates(track: NewImportedTrack, candidates: SearchResultItem[]): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const score = remoteScore(track, candidate);
      return { candidate, score, confidence: confidenceFor(score) };
    })
    .filter((r) => r.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// Ambiguous = no usable candidates, the best one isn't confident enough, or
// it isn't clearly better than the runner-up -- either way this needs a
// human to pick, not an auto-match.
export function isAmbiguous(ranked: RankedCandidate[]): boolean {
  if (ranked.length === 0) return true;
  if (ranked[0].score < AMBIGUITY_SCORE_THRESHOLD) return true;
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < AMBIGUITY_GAP_THRESHOLD) return true;
  return false;
}
