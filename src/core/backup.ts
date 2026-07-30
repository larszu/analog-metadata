/**
 * Full-library backup as a single JSON file — the migration/backup path users
 * of other apps most often ask for ("I lost my logs switching phones").
 * Pure (de)serialisation + validation; the DB read/write lives in data/backup.ts.
 */
import type {
  Camera,
  FilmStock,
  Frame,
  Lens,
  Roll,
  Settings,
} from "../domain/types";

export const BACKUP_VERSION = 1;

export interface BackupPayload {
  cameras: Camera[];
  lenses: Lens[];
  films: FilmStock[];
  rolls: Roll[];
  frames: Frame[];
  settings?: Settings;
}

export interface BackupBundle extends BackupPayload {
  app: "analog-metadata";
  version: number;
  exportedAt: string;
}

export function makeBackup(payload: BackupPayload): string {
  const bundle: BackupBundle = {
    app: "analog-metadata",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...payload,
  };
  return JSON.stringify(bundle, null, 2);
}

/** Parse and validate a backup file, throwing a clear error on bad input. */
export function readBackup(text: string): BackupBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = parsed as Partial<BackupBundle>;
  if (!b || b.app !== "analog-metadata") {
    throw new Error("This doesn't look like an Analog Metadata backup.");
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new Error(`Unsupported backup version (${b.version}). Update the app.`);
  }
  const arrays: (keyof BackupPayload)[] = ["cameras", "lenses", "films", "rolls", "frames"];
  for (const key of arrays) {
    if (!Array.isArray(b[key])) {
      throw new Error(`Backup is missing its "${key}" list.`);
    }
  }
  return b as BackupBundle;
}

export function backupSummary(b: BackupBundle): string {
  return `${b.rolls.length} rolls · ${b.frames.length} frames · ${b.cameras.length} cameras · ${b.lenses.length} lenses · ${b.films.length} films`;
}
