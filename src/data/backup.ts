/** DB read/write for full-library JSON backups. */
import { db } from "./db";
import { makeBackup, readBackup, type BackupBundle } from "../core/backup";
import { mergeLibraries } from "../core/sync";
import { applyLibrary, readLocalLibrary } from "./sync";

export async function exportAllData(): Promise<string> {
  return makeBackup(await readLocalLibrary());
}

/**
 * Restore a backup. "replace" wipes existing data first, then loads the backup.
 * "merge" combines it with the current library using last-write-wins (newer
 * `updatedAt` per record survives). Returns the parsed bundle for a summary.
 */
export async function importAllData(
  text: string,
  mode: "replace" | "merge",
): Promise<BackupBundle> {
  const bundle = readBackup(text);

  if (mode === "merge") {
    const local = await readLocalLibrary();
    const { merged } = mergeLibraries(local, bundle);
    await applyLibrary(merged);
    return bundle;
  }

  await db.transaction(
    "rw",
    [db.cameras, db.lenses, db.films, db.rolls, db.frames, db.settings],
    async () => {
      await Promise.all([
        db.cameras.clear(),
        db.lenses.clear(),
        db.films.clear(),
        db.rolls.clear(),
        db.frames.clear(),
      ]);
      await Promise.all([
        db.cameras.bulkPut(bundle.cameras),
        db.lenses.bulkPut(bundle.lenses),
        db.films.bulkPut(bundle.films),
        db.rolls.bulkPut(bundle.rolls),
        db.frames.bulkPut(bundle.frames),
      ]);
      if (bundle.settings) await db.settings.put({ ...bundle.settings, id: "singleton" });
    },
  );
  return bundle;
}
