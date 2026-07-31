/**
 * File-based "cloud sync": keep one backup file in a synced drive (iCloud
 * Drive, Dropbox, Google Drive …) and merge it in/out with last-write-wins.
 *
 * Where the File System Access API exists (Chromium desktop, incl. the Tauri
 * shell) we remember the file handle so "Sync now" is one tap. Elsewhere the
 * Settings page falls back to manual export + merge-import, which share the
 * same merge logic below.
 */
import { db, getSettings } from "./db";
import { mergeLibraries, type Library } from "../core/sync";
import { makeBackup, readBackup } from "../core/backup";

type FilePickerWindow = Window & {
  showSaveFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandle[]>;
};

export function fileSyncSupported(): boolean {
  const w = window as FilePickerWindow;
  return typeof w.showSaveFilePicker === "function" && typeof w.showOpenFilePicker === "function";
}

export async function readLocalLibrary(): Promise<Library> {
  const [cameras, lenses, films, rolls, frames, settings] = await Promise.all([
    db.cameras.toArray(),
    db.lenses.toArray(),
    db.films.toArray(),
    db.rolls.toArray(),
    db.frames.toArray(),
    getSettings(),
  ]);
  return { cameras, lenses, films, rolls, frames, settings };
}

export async function applyLibrary(lib: Library): Promise<void> {
  await db.transaction(
    "rw",
    [db.cameras, db.lenses, db.films, db.rolls, db.frames, db.settings],
    async () => {
      await Promise.all([
        db.cameras.bulkPut(lib.cameras),
        db.lenses.bulkPut(lib.lenses),
        db.films.bulkPut(lib.films),
        db.rolls.bulkPut(lib.rolls),
        db.frames.bulkPut(lib.frames),
      ]);
      if (lib.settings) await db.settings.put({ ...lib.settings, id: "singleton" });
    },
  );
}

const FILE_OPTS = {
  suggestedName: "analog-metadata-sync.json",
  types: [{ description: "Analog Metadata", accept: { "application/json": [".json"] } }],
};

async function ensurePermission(handle: FileSystemFileHandle): Promise<void> {
  const h = handle as FileSystemFileHandle & {
    queryPermission?: (d: { mode: string }) => Promise<PermissionState>;
    requestPermission?: (d: { mode: string }) => Promise<PermissionState>;
  };
  if (h.queryPermission && (await h.queryPermission({ mode: "readwrite" })) === "granted") return;
  if (h.requestPermission && (await h.requestPermission({ mode: "readwrite" })) === "granted") return;
  throw new Error("Permission to the sync file was denied");
}

/** Connect (or create) the sync file and remember its handle. */
export async function connectSyncFile(mode: "create" | "open"): Promise<string> {
  const w = window as FilePickerWindow;
  let handle: FileSystemFileHandle;
  if (mode === "create") {
    handle = await w.showSaveFilePicker!(FILE_OPTS);
  } else {
    const [h] = await w.showOpenFilePicker!({ types: FILE_OPTS.types });
    handle = h;
  }
  await db.meta.put({ key: "syncHandle", value: handle });
  return handle.name;
}

export async function getSyncFileName(): Promise<string | undefined> {
  const row = await db.meta.get("syncHandle");
  const handle = row?.value as FileSystemFileHandle | undefined;
  return handle?.name;
}

export async function getLastSyncedAt(): Promise<string | undefined> {
  const row = await db.meta.get("lastSyncedAt");
  return row?.value as string | undefined;
}

export async function disconnectSyncFile(): Promise<void> {
  await db.meta.delete("syncHandle");
}

export interface SyncOutcome {
  changed: number;
  fileName: string;
}

/** Two-way sync: merge the file into the DB, then write the merge back out. */
export async function syncNow(): Promise<SyncOutcome> {
  const row = await db.meta.get("syncHandle");
  const handle = row?.value as FileSystemFileHandle | undefined;
  if (!handle) throw new Error("No sync file connected yet");
  await ensurePermission(handle);

  const file = await handle.getFile();
  const text = (await file.text()).trim();
  const incoming: Library = text
    ? readBackup(text)
    : { cameras: [], lenses: [], films: [], rolls: [], frames: [] };

  const local = await readLocalLibrary();
  const { merged, changed } = mergeLibraries(local, incoming);
  await applyLibrary(merged);

  const writable = await handle.createWritable();
  await writable.write(makeBackup(merged));
  await writable.close();

  await db.meta.put({ key: "lastSyncedAt", value: new Date().toISOString() });
  return { changed, fileName: handle.name };
}
