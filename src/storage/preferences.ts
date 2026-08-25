import { createMMKV } from 'react-native-mmkv';

// Mirrors android-source's PreferencesStore.kt (DataStore) -- a flat
// key/value store for small app settings that don't belong in SQLite.
export const preferences = createMMKV({ id: 'polentita_preferences' });

const KEYS = {
  dinoHighScore: 'dino_high_score',
  libraryViewMode: 'library_view_mode',
} as const;

export function getDinoHighScore(): number {
  return preferences.getNumber(KEYS.dinoHighScore) ?? 0;
}

export function setDinoHighScore(score: number): void {
  preferences.set(KEYS.dinoHighScore, score);
}

export type LibraryViewMode = 'list' | 'grid';

export function getLibraryViewMode(): LibraryViewMode {
  return preferences.getString(KEYS.libraryViewMode) === 'grid' ? 'grid' : 'list';
}

export function setLibraryViewMode(mode: LibraryViewMode): void {
  preferences.set(KEYS.libraryViewMode, mode);
}
