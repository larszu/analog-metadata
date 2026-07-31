/**
 * Last-write-wins merge of two libraries, used for file-based "cloud sync"
 * (keep the backup file in any synced drive — iCloud, Dropbox, Drive) and for
 * merge-imports. Records are unioned by id; on conflict the newer `updatedAt`
 * wins. Deterministic and idempotent, so syncing the same file twice is a no-op.
 *
 * Note: this is an additive/edit merge — it does not delete records that are
 * absent from one side (no tombstones yet), so deletions don't propagate.
 */
import type {
  Camera,
  FilmStock,
  Frame,
  Lens,
  Roll,
  Settings,
} from "../domain/types";

export interface Library {
  cameras: Camera[];
  lenses: Lens[];
  films: FilmStock[];
  rolls: Roll[];
  frames: Frame[];
  settings?: Settings;
}

type Stamped = { id: string; updatedAt: string };

export function mergeById<T extends Stamped>(local: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);
  for (const item of incoming) {
    const current = byId.get(item.id);
    // Strictly-newer replaces; equal timestamps keep what we already have.
    if (!current || item.updatedAt > current.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()];
}

export interface MergeResult {
  merged: Library;
  changed: number; // records added or updated from the incoming side
}

function countIncomingWins<T extends Stamped>(local: T[], incoming: T[]): number {
  const byId = new Map(local.map((i) => [i.id, i] as const));
  let n = 0;
  for (const item of incoming) {
    const cur = byId.get(item.id);
    if (!cur || item.updatedAt > cur.updatedAt) n++;
  }
  return n;
}

export function mergeLibraries(local: Library, incoming: Library): MergeResult {
  const changed =
    countIncomingWins(local.cameras, incoming.cameras) +
    countIncomingWins(local.lenses, incoming.lenses) +
    countIncomingWins(local.films, incoming.films) +
    countIncomingWins(local.rolls, incoming.rolls) +
    countIncomingWins(local.frames, incoming.frames);

  return {
    merged: {
      cameras: mergeById(local.cameras, incoming.cameras),
      lenses: mergeById(local.lenses, incoming.lenses),
      films: mergeById(local.films, incoming.films),
      rolls: mergeById(local.rolls, incoming.rolls),
      frames: mergeById(local.frames, incoming.frames),
      // Settings carries no timestamp; keep the local one.
      settings: local.settings ?? incoming.settings,
    },
    changed,
  };
}
