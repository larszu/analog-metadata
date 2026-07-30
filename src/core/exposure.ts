/**
 * Exposure maths for the light meter.
 *
 * The exposure triangle is exact and fully testable. The only approximate part
 * of any phone light meter is turning a camera image into an absolute scene
 * luminance — so we prefer the camera's *actual* exposure settings when the
 * browser exposes them (giving a correct EV), and fall back to a calibrated
 * estimate from mean image brightness otherwise.
 */
import { APERTURE_SCALE, SHUTTER_SPEEDS } from "../domain/constants";

/** EV at ISO 100 from an aperture (f-number), shutter (seconds) and ISO. */
export function ev100FromExposure(apertureN: number, shutterSeconds: number, iso = 100): number {
  const evAtIso = Math.log2((apertureN * apertureN) / shutterSeconds);
  return evAtIso - Math.log2(iso / 100);
}

/** Correct EV from the camera's real exposure settings (accurate path). */
export function ev100FromCameraSettings(s: {
  apertureN: number;
  exposureTimeSeconds: number;
  iso: number;
}): number | undefined {
  if (!(s.apertureN > 0) || !(s.exposureTimeSeconds > 0) || !(s.iso > 0)) return undefined;
  return ev100FromExposure(s.apertureN, s.exposureTimeSeconds, s.iso);
}

/**
 * Estimate EV100 from a mean luma (0..1) and a calibration offset in EV.
 * Mid-grey (0.18) maps to `calibrationEv`; every doubling of luma adds a stop.
 * Approximate — expose the calibration so users can match a handheld meter.
 */
export function ev100FromLuma(luma: number, calibrationEv: number): number {
  const clamped = Math.min(1, Math.max(luma, 1 / 255));
  return calibrationEv + Math.log2(clamped / 0.18);
}

/** Shutter time (seconds) needed for a given EV100, ISO and aperture. */
export function shutterForAperture(ev100: number, iso: number, apertureN: number): number {
  const evAtIso = ev100 + Math.log2(iso / 100);
  return (apertureN * apertureN) / Math.pow(2, evAtIso);
}

/** Aperture (f-number) needed for a given EV100, ISO and shutter time. */
export function apertureForShutter(ev100: number, iso: number, shutterSeconds: number): number {
  const evAtIso = ev100 + Math.log2(iso / 100);
  return Math.sqrt(Math.pow(2, evAtIso) * shutterSeconds);
}

/** Format a shutter time in seconds as a readable label ("1/125", "2s", "B"). */
export function formatShutter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}s`;
  }
  return `1/${Math.round(1 / seconds)}`;
}

function shutterLabelToSeconds(label: string): number | undefined {
  const frac = label.match(/^1\/(\d+)$/);
  if (frac) return 1 / Number(frac[1]);
  const n = Number(label);
  return Number.isFinite(n) ? n : undefined;
}

/** Snap a shutter time to the nearest marked speed on the dial. */
export function nearestShutterLabel(seconds: number): string {
  let best = "";
  let bestDiff = Infinity;
  for (const label of SHUTTER_SPEEDS) {
    const s = shutterLabelToSeconds(label);
    if (s === undefined) continue;
    const diff = Math.abs(Math.log2(s) - Math.log2(seconds));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = label;
    }
  }
  return best;
}

/** Snap an f-number to the nearest full/half stop on the aperture scale. */
export function nearestApertureLabel(apertureN: number): string {
  let best = "";
  let bestDiff = Infinity;
  for (const label of APERTURE_SCALE) {
    const n = Number(label);
    if (!Number.isFinite(n)) continue;
    const diff = Math.abs(n - apertureN);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = label;
    }
  }
  return best;
}

export interface ExposurePair {
  aperture: string;
  shutter: string;
  shutterSeconds: number;
}

/**
 * For a given EV100 and ISO, produce the shutter speed for each aperture on the
 * scale — the classic exposure table a photographer picks a combination from.
 */
export function exposureTable(ev100: number, iso: number): ExposurePair[] {
  return APERTURE_SCALE.filter((a) => Number.isFinite(Number(a))).map((a) => {
    const apertureN = Number(a);
    const seconds = shutterForAperture(ev100, iso, apertureN);
    return { aperture: a, shutter: nearestShutterLabel(seconds), shutterSeconds: seconds };
  });
}

/** Mean luma (0..1) of RGBA pixel data, ITU-R BT.601 weights. */
export function meanLuma(rgba: Uint8ClampedArray | Uint8Array): number {
  if (rgba.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const lin = (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) / 255;
    sum += lin;
    count++;
  }
  return count ? sum / count : 0;
}
