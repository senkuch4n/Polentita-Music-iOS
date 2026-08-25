import { Directory, Paths } from 'expo-file-system';

// Mirrors the Android app's managed library tree (core/storage/LibraryStorage.kt:
// Music / Covers / Imports / Downloads under the picked SAF folder). iOS has no
// equivalent of an arbitrary persisted external tree, so the app's own sandboxed
// Documents directory is the managed root instead (see project plan §3).
export const musicDirectory = new Directory(Paths.document, 'Music');
export const coversDirectory = new Directory(Paths.document, 'Covers');
export const downloadsDirectory = new Directory(Paths.document, 'Downloads');

export function ensureLibraryDirectories(): void {
  for (const dir of [musicDirectory, coversDirectory, downloadsDirectory]) {
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}
