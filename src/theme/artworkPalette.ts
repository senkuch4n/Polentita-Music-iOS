// Ported from android-source's core/designsystem/ArtworkPalette.kt
// (ArtworkColorAnalyzer.fallback/buildPalette/normalizeAccent/safeContentColor) --
// every song gets a deterministic, tasteful accent derived from its title+artist,
// so the player/mini-player can glow with "its own" color even before real
// cover-pixel extraction is wired up. Real extraction (average color from the
// actual artwork image) can layer on top of this later without changing the
// shape callers depend on.
import { contentColors, fallbackColors } from './tokens';

export interface ArtworkPalette {
  dominant: string;
  vibrant: string;
  muted: string;
  background: string;
  surface: string;
  accent: string;
  onBackground: string;
  onAccent: string;
}

const MIN_TEXT_CONTRAST = 4.5;

function stableHash(value: string): number {
  let hash = 0x51f15e;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return hash & 0x7fffffff;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blend(a: string, b: string, ratioOfB: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return toHex([
    ar + (br - ar) * ratioOfB,
    ag + (bg - ag) * ratioOfB,
    ab + (bb - ab) * ratioOfB,
  ]);
}

// Relative luminance + WCAG contrast ratio, matching ColorUtils.calculateContrast.
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg) + 0.05;
  const l2 = relativeLuminance(bg) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

export function safeContentColor(background: string): string {
  const light = contentColors.primaryOnDark;
  const dark = contentColors.darkOnBright;
  const lightContrast = contrastRatio(light, background);
  const darkContrast = contrastRatio(dark, background);
  return lightContrast >= MIN_TEXT_CONTRAST || lightContrast >= darkContrast ? light : dark;
}

function normalizeAccent(hex: string, seed: string): string {
  let [h, s, l] = rgbToHsl(...hexToRgb(hex));
  if (s < 0.15) {
    h = (stableHash(seed) >>> 1) % 360;
  }
  s = Math.min(0.86, Math.max(0.52, s));
  l = Math.min(0.66, Math.max(0.48, l));
  let accent = toHex(hslToRgb(h, s, l));
  let guard = 0;
  while (
    (contrastRatio(accent, fallbackColors.background) < MIN_TEXT_CONTRAST ||
      Math.max(contrastRatio(contentColors.primaryOnDark, accent), contrastRatio(contentColors.darkOnBright, accent)) <
        MIN_TEXT_CONTRAST) &&
    l < 0.88 &&
    guard < 20
  ) {
    l = Math.min(0.88, l + 0.04);
    accent = toHex(hslToRgb(h, s, l));
    guard++;
  }
  return accent;
}

function buildPalette(dominantHex: string, vibrantHex: string, mutedHex: string, seed: string): ArtworkPalette {
  const accent = normalizeAccent(vibrantHex, seed);
  const background = blend(dominantHex, '#000000', 0.78);
  const surface = blend(mutedHex, '#000000', 0.68);
  return {
    dominant: dominantHex,
    vibrant: accent,
    muted: mutedHex,
    background,
    surface,
    accent,
    onBackground: contentColors.primaryOnDark,
    onAccent: safeContentColor(accent),
  };
}

/** Deterministic palette derived from a song's title|artist -- same song always
 * glows the same color, no cover art required. */
export function fallbackArtworkPalette(seed: string): ArtworkPalette {
  const hash = stableHash(seed || 'Polentita Music');
  const hue = (hash >>> 1) % 360;
  const secondaryHue = (hue + 34 + (hash % 76)) % 360;
  const dominant = toHex(hsvToRgb(hue, 0.58, 0.62));
  const vibrant = toHex(hsvToRgb(secondaryHue, 0.76, 0.82));
  const muted = toHex(hsvToRgb(hue, 0.32, 0.48));
  return buildPalette(dominant, vibrant, muted, seed);
}
