/** DB read/write for full-library JSON backups. */
import { db, getSettings } from "./db";
import { makeBackup, readBackup, type BackupBundle } from "../core/backup";

export async function exportAllData(): Promise<string> {
  const [cameras, lenses, films, rolls, frames, settings] = await Promise.all([
    db.cameras.toArray(),
    db.lenses.toArray(),
    db.films.toArray(),
    db.rolls.toArray(),
    db.frames.toArray(),
    getSettings(),
  ]);
  return makeBackup({ cameras, lenses, films, rolls, frames, settings });
}

/**
 * Restore a backup. "replace" wipes existing data first; "merge" upserts by id
 * (backup wins on conflicts). Returns the parsed bundle for a summary message.
 */
export async function importAllData(
  text: string,
  mode: "replace" | "merge",
): Promise<BackupBundle> {
  const bundle = readBackup(text);
  await db.transaction(
    "rw",
    [db.cameras, db.lenses, db.films, db.rolls, db.frames, db.settings],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.cameras.clear(),
          db.lenses.clear(),
          db.films.clear(),
          db.rolls.clear(),
          db.frames.clear(),
        ]);
      }
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
