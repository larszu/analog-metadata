import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";
import type { Camera, FilmStock, Frame, Roll } from "../domain/types";

const now = "2026-07-30T10:00:00.000Z";
const cameras: Camera[] = [
  { id: "c1", make: "Nikon", model: "FM2", format: "135", createdAt: now, updatedAt: now },
  { id: "c2", make: "Hasselblad", model: "500C/M", format: "120", createdAt: now, updatedAt: now },
];
const films: FilmStock[] = [
  { id: "f1", brand: "Kodak", name: "Portra 400", iso: 400, type: "color-negative", format: "135", process: "C-41", createdAt: now, updatedAt: now },
];
const rolls: Roll[] = [
  { id: "r1", label: "A", cameraId: "c1", filmStockId: "f1", frameCount: 2, createdAt: now, updatedAt: now },
  { id: "r2", label: "B", cameraId: "c1", filmStockId: "f1", frameCount: 1, createdAt: now, updatedAt: now },
];
const frames: Frame[] = [
  { id: "x1", rollId: "r1", frameNumber: 1, aperture: "5.6", scanFileName: "a.jpg", keywords: [], createdAt: now, updatedAt: now },
  { id: "x2", rollId: "r1", frameNumber: 2, aperture: "5.6", keywords: [], createdAt: now, updatedAt: now },
  { id: "x3", rollId: "r2", frameNumber: 1, aperture: "8", keywords: [], createdAt: now, updatedAt: now },
];

describe("computeStats", () => {
  const s = computeStats({ cameras, lenses: [], films, rolls, frames });

  it("counts totals", () => {
    expect(s.rolls).toBe(2);
    expect(s.frames).toBe(3);
    expect(s.framesLinked).toBe(1);
    expect(s.framesLogged).toBe(3);
  });

  it("ranks the most-used camera by roll", () => {
    expect(s.topCameras[0]).toEqual({ label: "Nikon FM2", count: 2 });
  });

  it("ranks apertures by frame, most first", () => {
    expect(s.topApertures[0]).toEqual({ label: "f/5.6", count: 2 });
    expect(s.topApertures[1]).toEqual({ label: "f/8", count: 1 });
  });

  it("ranks films", () => {
    expect(s.topFilms[0]).toEqual({ label: "Kodak Portra 400", count: 2 });
  });
});
