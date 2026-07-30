/** Thin CRUD helpers that keep id + timestamps consistent across entities. */
import { db, newId, nowIso } from "./db";
import type { Camera, FilmStock, Frame, Lens, Roll } from "../domain/types";

type Timestamped = { id: string; createdAt: string; updatedAt: string };
type NewData<T extends Timestamped> = Omit<T, "id" | "createdAt" | "updatedAt">;

// --- Cameras ---------------------------------------------------------------
export async function createCamera(data: NewData<Camera>): Promise<Camera> {
  const ts = nowIso();
  const camera: Camera = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
  await db.cameras.add(camera);
  return camera;
}
export async function updateCamera(id: string, patch: Partial<Camera>) {
  await db.cameras.update(id, { ...patch, updatedAt: nowIso() });
}
export async function deleteCamera(id: string) {
  await db.cameras.delete(id);
}

// --- Lenses ----------------------------------------------------------------
export async function createLens(data: NewData<Lens>): Promise<Lens> {
  const ts = nowIso();
  const lens: Lens = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
  await db.lenses.add(lens);
  return lens;
}
export async function updateLens(id: string, patch: Partial<Lens>) {
  await db.lenses.update(id, { ...patch, updatedAt: nowIso() });
}
export async function deleteLens(id: string) {
  await db.lenses.delete(id);
}

// --- Films -----------------------------------------------------------------
export async function createFilm(data: NewData<FilmStock>): Promise<FilmStock> {
  const ts = nowIso();
  const film: FilmStock = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
  await db.films.add(film);
  return film;
}
export async function updateFilm(id: string, patch: Partial<FilmStock>) {
  await db.films.update(id, { ...patch, updatedAt: nowIso() });
}
export async function deleteFilm(id: string) {
  await db.films.delete(id);
}

// --- Rolls -----------------------------------------------------------------
export async function createRoll(data: NewData<Roll>): Promise<Roll> {
  const ts = nowIso();
  const roll: Roll = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
  await db.rolls.add(roll);
  return roll;
}
export async function updateRoll(id: string, patch: Partial<Roll>) {
  await db.rolls.update(id, { ...patch, updatedAt: nowIso() });
}
export async function deleteRoll(id: string) {
  await db.transaction("rw", db.rolls, db.frames, async () => {
    await db.frames.where("rollId").equals(id).delete();
    await db.rolls.delete(id);
  });
}

// --- Frames ----------------------------------------------------------------
export async function createFrame(data: NewData<Frame>): Promise<Frame> {
  const ts = nowIso();
  const frame: Frame = { ...data, id: newId(), createdAt: ts, updatedAt: ts };
  await db.frames.add(frame);
  return frame;
}
export async function updateFrame(id: string, patch: Partial<Frame>) {
  await db.frames.update(id, { ...patch, updatedAt: nowIso() });
}
export async function deleteFrame(id: string) {
  await db.frames.delete(id);
}

/** Create the N frames for a roll (1..frameCount) if none exist yet. */
export async function ensureFramesForRoll(roll: Roll): Promise<void> {
  const existing = await db.frames.where("rollId").equals(roll.id).count();
  if (existing > 0) return;
  const ts = nowIso();
  const frames: Frame[] = [];
  for (let n = 1; n <= roll.frameCount; n++) {
    frames.push({
      id: newId(),
      rollId: roll.id,
      frameNumber: n,
      keywords: [],
      weather: [],
      createdAt: ts,
      updatedAt: ts,
    });
  }
  await db.frames.bulkAdd(frames);
}
