import { describe, expect, it } from "vitest";
import { searchAll, type SearchIndex } from "./search";
import type { Camera, FilmStock, Frame, Roll } from "../domain/types";

const now = "2026-07-30T10:00:00.000Z";
const camera: Camera = { id: "c1", make: "Nikon", model: "FM2", format: "135", createdAt: now, updatedAt: now };
const film: FilmStock = { id: "f1", brand: "Kodak", name: "Portra 400", iso: 400, type: "color-negative", format: "135", process: "C-41", createdAt: now, updatedAt: now };
const roll: Roll = { id: "r1", label: "Hamburg trip", frameCount: 2, createdAt: now, updatedAt: now };
const frame: Frame = { id: "fr1", rollId: "r1", frameNumber: 3, title: "Harbour crane", keywords: ["architecture"], location: "Speicherstadt", createdAt: now, updatedAt: now };

const idx: SearchIndex = { cameras: [camera], lenses: [], films: [film], rolls: [roll], frames: [frame] };

describe("searchAll", () => {
  it("returns nothing for an empty query", () => {
    expect(searchAll("  ", idx)).toEqual([]);
  });
  it("finds a camera by model", () => {
    const hits = searchAll("fm2", idx);
    expect(hits.some((h) => h.type === "camera")).toBe(true);
  });
  it("finds a frame by keyword and links its roll", () => {
    const hits = searchAll("architecture", idx);
    const frameHit = hits.find((h) => h.type === "frame");
    expect(frameHit?.rollId).toBe("r1");
    expect(frameHit?.subtitle).toContain("Hamburg trip");
  });
  it("finds a frame by location and a roll by label", () => {
    expect(searchAll("speicherstadt", idx).some((h) => h.type === "frame")).toBe(true);
    expect(searchAll("hamburg", idx).some((h) => h.type === "roll")).toBe(true);
  });
  it("is case-insensitive across films", () => {
    expect(searchAll("PORTRA", idx).some((h) => h.type === "film")).toBe(true);
  });
});
