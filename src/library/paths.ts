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

// The Python bridge (ctypes/ObjC, not expo-file-system) deals in plain POSIX
// paths, not `file://` URIs -- os.makedirs()/yt-dlp's outtmpl would otherwise
// try to create a directory literally named "file:...". Convert at the
// boundary in both directions instead of threading URIs into Python.
export function toPosixPath(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

export function toFileUri(posixPath: string): string {
  return posixPath.startsWith('file://') ? posixPath : `file://${posixPath}`;
}

// Downloads have no native progress callback wired up yet (the ObjC/Python
// bridge only exposes a one-shot promise -- see downloads/downloadManager.ts),
// so progress is derived by polling how many bytes yt-dlp has physically
// written into `downloadsDirectory` so far.
export function directorySizeBytes(dir: Directory): number {
  let total = 0;
  for (const entry of dir.list()) {
    if ('size' in entry && typeof entry.size === 'number') {
      total += entry.size;
    }
  }
  return total;
}
