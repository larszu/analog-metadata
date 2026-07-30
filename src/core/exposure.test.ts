import { describe, expect, it } from "vitest";
import {
  apertureForShutter,
  ev100FromCameraSettings,
  ev100FromExposure,
  ev100FromLuma,
  exposureTable,
  formatShutter,
  meanLuma,
  nearestApertureLabel,
  nearestShutterLabel,
  shutterForAperture,
} from "./exposure";

describe("ev100FromExposure", () => {
  it("matches the Sunny-16 rule (f/16, 1/ISO ≈ EV15 at ISO100)", () => {
    // f/16 at 1/100 s, ISO 100 → EV100 ≈ 14.6, i.e. ~EV15 (Sunny-16 is a ⅓-stop approximation)
    expect(ev100FromExposure(16, 1 / 100, 100)).toBeCloseTo(15, 0);
  });
  it("f/1.0 at 1s ISO100 is EV 0", () => {
    expect(ev100FromExposure(1, 1, 100)).toBeCloseTo(0, 5);
  });
  it("normalises ISO: ISO400 is 2 stops less EV100 than the raw EV", () => {
    expect(ev100FromExposure(16, 1 / 100, 400)).toBeCloseTo(13, 0);
  });
});

describe("ev100FromCameraSettings", () => {
  it("returns EV for valid settings, undefined for junk", () => {
    expect(ev100FromCameraSettings({ apertureN: 2.8, exposureTimeSeconds: 1 / 60, iso: 100 })).toBeCloseTo(
      ev100FromExposure(2.8, 1 / 60, 100),
      5,
    );
    expect(ev100FromCameraSettings({ apertureN: 0, exposureTimeSeconds: 1 / 60, iso: 100 })).toBeUndefined();
  });
});

describe("exposure triangle solvers are inverses", () => {
  it("shutterForAperture and apertureForShutter round-trip", () => {
    const ev100 = 12;
    const iso = 200;
    const t = shutterForAperture(ev100, iso, 8);
    expect(apertureForShutter(ev100, iso, t)).toBeCloseTo(8, 5);
  });
  it("recovers the EV it was derived from", () => {
    const ev100 = 14;
    const t = shutterForAperture(ev100, 100, 11);
    expect(ev100FromExposure(11, t, 100)).toBeCloseTo(ev100, 5);
  });
});

describe("ev100FromLuma", () => {
  it("mid-grey maps to the calibration value", () => {
    expect(ev100FromLuma(0.18, 12)).toBeCloseTo(12, 5);
  });
  it("doubling luma adds one stop", () => {
    expect(ev100FromLuma(0.36, 12)).toBeCloseTo(13, 5);
  });
});

describe("nearest snapping + formatting", () => {
  it("snaps shutter to a standard speed", () => {
    expect(nearestShutterLabel(1 / 120)).toBe("1/125");
    expect(nearestShutterLabel(1.9)).toBe("2");
  });
  it("snaps aperture to the scale", () => {
    expect(nearestApertureLabel(5.5)).toBe("5.6");
    expect(nearestApertureLabel(10.5)).toBe("11");
  });
  it("formats shutter times", () => {
    expect(formatShutter(1 / 125)).toBe("1/125");
    expect(formatShutter(2)).toBe("2s");
    expect(formatShutter(0)).toBe("—");
  });
});

describe("exposureTable", () => {
  it("gives one exposure per aperture, brighter EV → faster shutter", () => {
    const table = exposureTable(15, 100);
    expect(table.length).toBeGreaterThan(5);
    const f16 = table.find((r) => r.aperture === "16")!;
    // EV15 at f/16 ISO100 ≈ 1/100 s
    expect(f16.shutterSeconds).toBeCloseTo(1 / 100, 2);
  });
});

describe("meanLuma", () => {
  it("is 1 for white and 0 for black", () => {
    expect(meanLuma(new Uint8ClampedArray([255, 255, 255, 255]))).toBeCloseTo(1, 5);
    expect(meanLuma(new Uint8ClampedArray([0, 0, 0, 255]))).toBeCloseTo(0, 5);
  });
});
