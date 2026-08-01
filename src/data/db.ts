import Dexie, { type Table } from "dexie";
import type {
  Camera,
  FilmStock,
  Frame,
  Id,
  Lens,
  Roll,
  Settings,
} from "../domain/types";

/**
 * Local-first persistence. Dexie wraps IndexedDB, which is available in the
 * browser and inside the Tauri (desktop) and Capacitor (mobile) webviews, so
 * the same storage layer runs unchanged on all four target platforms.
 */
export class AnalogDb extends Dexie {
  cameras!: Table<Camera, Id>;
  lenses!: Table<Lens, Id>;
  films!: Table<FilmStock, Id>;
  rolls!: Table<Roll, Id>;
  frames!: Table<Frame, Id>;
  settings!: Table<Settings, string>;
  /** Arbitrary key/value store (e.g. the connected sync-file handle). */
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("analog-metadata");
    this.version(1).stores({
      cameras: "id, make, model, updatedAt",
      lenses: "id, make, model, updatedAt",
      films: "id, brand, name, updatedAt",
      rolls: "id, label, cameraId, filmStockId, updatedAt",
      frames: "id, rollId, frameNumber, updatedAt",
      settings: "id",
    });
    this.version(2).stores({
      meta: "key",
    });
  }
}

export const db = new AnalogDb();

export function newId(): Id {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

const SETTINGS_DEFAULTS: Settings = {
  id: "singleton",
  softwareTag: "Analog Metadata 0.1",
  locale: "en",
};

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get("singleton");
  if (existing) return existing;
  await db.settings.put(SETTINGS_DEFAULTS);
  return SETTINGS_DEFAULTS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "singleton" });
}
