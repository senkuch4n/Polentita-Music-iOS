// Text normalization for matching imported tracks against YouTube search
// results / the local library -- ported from android-source's
// PlaylistImportMatcher.kt normalization rules.

const VERSION_MARKERS = [
  'live',
  'concert',
  'cover',
  'remix',
  'slowed',
  'nightcore',
  'instrumental',
  'karaoke',
  'acoustic',
  'lyrics',
  'lyric',
] as const;

const NOISE_PATTERNS = [
  /\(\s*(official\s*(video|audio|music\s*video)?|lyrics?|remaster(ed)?(\s*\d{4})?|\d{4}\s*remaster(ed)?|hd|hq|explicit|clean)\s*\)/gi,
  /\[\s*(official\s*(video|audio|music\s*video)?|lyrics?|remaster(ed)?(\s*\d{4})?|\d{4}\s*remaster(ed)?|hd|hq|explicit|clean)\s*\]/gi,
  /\s*-\s*(official\s*(video|audio|music\s*video)|lyrics?)\s*$/gi,
];

const FEAT_PATTERN = /\s*[([]?\s*(feat\.?|ft\.?|featuring)\s+[^)\]]*[)\]]?\s*$/gi;

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (combining marks left behind by NFD)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripVersionNoise(title: string): string {
  let result = title;
  for (const pattern of NOISE_PATTERNS) result = result.replace(pattern, ' ');
  result = result.replace(FEAT_PATTERN, '');
  return result.trim();
}

export function detectVersionMarkers(title: string): Set<string> {
  const normalized = normalizeText(title);
  const found = new Set<string>();
  for (const marker of VERSION_MARKERS) {
    if (normalized.includes(marker)) found.add(marker);
  }
  return found;
}

const ARTIST_SEPARATORS = /\s*(?:;|,|&|\/|\bfeat\.?\b|\bft\.?\b|\band\b|\by\b)\s*/gi;

export function normalizeArtists(artist: string): string {
  const parts = artist
    .split(ARTIST_SEPARATORS)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .sort();
  return parts.join(' ');
}

export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(' ').filter(Boolean));
  // Two blank fields (e.g. both albums empty) are "no signal", not a match --
  // scoring them as identical falsely inflated matches against unrelated
  // songs that both happen to have an empty album/artist.
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) if (tokensB.has(token)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function buildSearchQuery(title: string, artist: string): string {
  const cleanTitle = stripVersionNoise(title);
  return artist ? `${artist} ${cleanTitle}` : cleanTitle;
}
