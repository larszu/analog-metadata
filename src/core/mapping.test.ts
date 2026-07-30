import { describe, expect, it } from "vitest";
import {
  parseAperture,
  parseFocalLength,
  parseShutterSeconds,
  resolveFrameMetadata,
} from "./mapping";
import type { Camera, FilmStock, Frame, Lens, Roll } from "../domain/types";

const now = "2026-07-30T10:00:00.000Z";

describe("parseAperture", () => {
  it("parses plain and prefixed forms", () => {
    expect(parseAperture("5.6")).toBe(5.6);
    expect(parseAperture("f/8")).toBe(8);
    expect(parseAperture("F2,8")).toBe(2.8);
  });
  it("returns undefined for junk", () => {
    expect(parseAperture(undefined)).toBeUndefined();
    expect(parseAperture("open")).toBeUndefined();
  });
});

describe("parseShutterSeconds", () => {
  it("parses fractions and whole seconds", () => {
    expect(parseShutterSeconds("1/125")).toBeCloseTo(0.008, 5);
    expect(parseShutterSeconds("2")).toBe(2);
    expect(parseShutterSeconds("0.5")).toBe(0.5);
  });
  it("treats bulb/time as no fixed duration", () => {
    expect(parseShutterSeconds("B")).toBeUndefined();
    expect(parseShutterSeconds("T")).toBeUndefined();
  });
});

describe("parseFocalLength", () => {
  it("parses primes and zoom long-end", () => {
    expect(parseFocalLength("50mm")).toBe(50);
    expect(parseFocalLength("24-70")).toBe(70);
    expect(parseFocalLength(undefined)).toBeUndefined();
  });
});

describe("resolveFrameMetadata", () => {
  const camera: Camera = {
    id: "c1", make: "Nikon", model: "FM2", serial: "12345",
    format: "135", createdAt: now, updatedAt: now,
  };
  const lens: Lens = {
    id: "l1", make: "Nikon", model: "50mm f/1.8", focalLength: "50",
    createdAt: now, updatedAt: now,
  };
  const film: FilmStock = {
    id: "f1", brand: "Kodak", name: "Portra 400", iso: 400,
    type: "color-negative", format: "135", process: "C-41",
    createdAt: now, updatedAt: now,
  };
  const roll: Roll = {
    id: "r1", label: "Portra #14", cameraId: "c1", filmStockId: "f1",
    frameCount: 36, pushExposureIndex: 800, artist: "Jane Doe",
    createdAt: now, updatedAt: now,
  };
  const frame: Frame = {
    id: "fr1", rollId: "r1", frameNumber: 5, lensId: "l1",
    aperture: "5.6", shutterSpeed: "1/125", title: "Harbour crane",
    keywords: ["hamburg"], weather: ["overcast"], scanFileName: "img_005.tif",
    createdAt: now, updatedAt: now,
  };

  it("flattens all layers into one record", () => {
    const m = resolveFrameMetadata({
      frame, roll, camera, lens, film,
      settings: { softwareTag: "Analog Metadata 0.1" },
    });
    expect(m.make).toBe("Nikon");
    expect(m.model).toBe("FM2");
    expect(m.lensModel).toBe("Nikon 50mm f/1.8");
    expect(m.focalLengthMm).toBe(50);
    expect(m.fNumber).toBe(5.6);
    expect(m.exposureTimeSeconds).toBeCloseTo(0.008, 5);
    expect(m.iso).toBe(800); // push overrides box speed
    expect(m.title).toBe("Harbour crane");
    expect(m.artist).toBe("Jane Doe");
    expect(m.software).toBe("Analog Metadata 0.1");
  });

  it("adds film/weather/camera keywords without duplicates", () => {
    const m = resolveFrameMetadata({ frame, roll, camera, lens, film });
    expect(m.keywords).toContain("hamburg");
    expect(m.keywords).toContain("Kodak Portra 400");
    expect(m.keywords).toContain("Overcast");
    expect(m.keywords).toContain("Nikon FM2");
    expect(new Set(m.keywords).size).toBe(m.keywords.length);
  });

  it("falls back to box speed when no push index", () => {
    const m = resolveFrameMetadata({
      frame, roll: { ...roll, pushExposureIndex: undefined }, camera, lens, film,
    });
    expect(m.iso).toBe(400);
  });
});
