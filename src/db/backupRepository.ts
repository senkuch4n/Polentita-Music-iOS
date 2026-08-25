import type { SQLiteDatabase } from 'expo-sqlite';

// Mirrors android-source's BackupManager.kt: snapshots DB rows (not the
// audio files themselves) into a single JSON payload. Restoring wipes and
// re-inserts these tables verbatim -- songs whose contentUri no longer
// points at a real file on this device will simply show up unavailable,
// same documented limitation as the Android app ("las copias de seguridad
// no sustituyen una copia de tus archivos de audio").
const BACKUP_VERSION = 1;
const TABLES = ['albums', 'songs', 'playlists', 'playlist_songs', 'playback_history'] as const;

export interface BackupPayload {
  version: number;
  createdAt: number;
  audioIncluded: false;
  tables: Record<(typeof TABLES)[number], any[]>;
}

export async function exportBackup(db: SQLiteDatabase): Promise<BackupPayload> {
  const tables = {} as BackupPayload['tables'];
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  return {
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    audioIncluded: false,
    tables,
  };
}

function columnsFor(rows: any[]): string[] {
  return rows.length > 0 ? Object.keys(rows[0]) : [];
}

export async function importBackup(db: SQLiteDatabase, payload: BackupPayload): Promise<void> {
  if (!payload || typeof payload !== 'object' || !payload.tables) {
    throw new Error('El archivo no tiene un formato de copia de seguridad válido');
  }

  await db.withTransactionAsync(async () => {
    // Children first to satisfy foreign keys.
    for (const table of [...TABLES].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const rows = payload.tables[table] ?? [];
      const columns = columnsFor(rows);
      if (columns.length === 0) continue;
      const placeholders = columns.map(() => '?').join(', ');
      for (const row of rows) {
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          ...columns.map((c) => row[c]),
        );
      }
    }
  });
}
