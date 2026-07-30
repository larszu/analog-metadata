/**
 * Flattens the layered logbook data (camera + lens + roll + film + frame) into
 * a single resolved metadata record per scan. Everything downstream — XMP
 * sidecars, embedded EXIF, CSV — consumes this shape, so the mapping rules live
 * in exactly one place.
 */
import type {
  Camera,
  FilmStock,
  Frame,
  Lens,
  Roll,
  Settings,
} from "../domain/types";
import { WEATHER_OPTIONS } from "../domain/constants";

export interface ResolvedMetadata {
  scanFileName?: string;
  frameNumber: number;

  make?: string;
  model?: string;
  serialNumber?: string;

  lensMake?: string;
  lensModel?: string;
  /** Numeric focal length in mm if we could parse one. */
  focalLengthMm?: number;

  /** f-number as a decimal, e.g. 5.6. */
  fNumber?: number;
  /** Shutter speed in seconds as a decimal, e.g. 0.008 for 1/125. */
  exposureTimeSeconds?: number;
  /** The literal shutter notation for human-readable fields ("1/125", "B"). */
  shutterLabel?: string;
  /** Effective ISO (push/pull applied over box speed). */
  iso?: number;

  filmDescription?: string;

  title?: string;
  description?: string;
  keywords: string[];
  dateTakenIso?: string;
  location?: string;
  gps?: { lat: number; lon: number; alt?: number };

  artist?: string;
  copyright?: string;
  software: string;
  /** Free-text dump of everything, useful for UserComment / notes fields. */
  userComment?: string;
}

/** Parse "5.6" / "f/5.6" / "F5,6" into 5.6. Returns undefined if not numeric. */
export function parseAperture(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/f\/?/i, "").replace(",", ".").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse a shutter notation into seconds.
 *   "1/125" -> 0.008,  "2" -> 2,  "0.5" -> 0.5,  "B"/"T" -> undefined.
 */
export function parseShutterSeconds(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toUpperCase();
  if (s === "B" || s === "T") return undefined;
  const frac = s.match(/^1\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const denom = Number.parseFloat(frac[1]);
    return denom > 0 ? 1 / denom : undefined;
  }
  const n = Number.parseFloat(s.replace(",", ".").replace(/["s]/gi, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a focal length like "50", "50mm", "24-70" (takes the long end). */
export function parseFocalLength(raw?: string): number | undefined {
  if (!raw) return undefined;
  const nums = raw.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return undefined;
  const n = Number.parseFloat(nums[nums.length - 1]);
  return Number.isFinite(n) ? n : undefined;
}

function weatherLabel(value: string): string {
  return WEATHER_OPTIONS.find((w) => w.value === value)?.label ?? value;
}

export interface ResolveInput {
  frame: Frame;
  roll?: Roll;
  camera?: Camera;
  lens?: Lens;
  film?: FilmStock;
  settings?: Pick<Settings, "softwareTag" | "defaultArtist" | "defaultCopyright">;
}

export function resolveFrameMetadata(input: ResolveInput): ResolvedMetadata {
  const { frame, roll, camera, lens, film, settings } = input;

  const iso = roll?.pushExposureIndex || film?.iso;

  const filmDescription = film
    ? `${film.brand} ${film.name} (ISO ${film.iso}${
        roll?.pushExposureIndex && roll.pushExposureIndex !== film.iso
          ? ` shot at ${roll.pushExposureIndex}`
          : ""
      })`
    : undefined;

  // Keywords: user keywords + film + weather + camera, de-duplicated.
  const keywords = new Set<string>();
  frame.keywords?.forEach((k) => k.trim() && keywords.add(k.trim()));
  if (film) {
    keywords.add(`${film.brand} ${film.name}`);
    keywords.add("analog");
    keywords.add("film");
  }
  frame.weather?.forEach((w) => keywords.add(weatherLabel(w)));
  if (camera) keywords.add(`${camera.make} ${camera.model}`.trim());

  const focalLengthMm =
    parseFocalLength(frame.focalLength) ?? parseFocalLength(lens?.focalLength);

  const artist = roll?.artist || settings?.defaultArtist;
  const copyright = roll?.copyright || settings?.defaultCopyright;

  const userCommentParts: string[] = [];
  if (filmDescription) userCommentParts.push(`Film: ${filmDescription}`);
  if (frame.aperture) userCommentParts.push(`Aperture: f/${frame.aperture}`);
  if (frame.shutterSpeed) userCommentParts.push(`Shutter: ${frame.shutterSpeed}`);
  if (roll?.developer) userCommentParts.push(`Developer: ${roll.developer}`);
  if (roll?.lab) userCommentParts.push(`Lab: ${roll.lab}`);
  if (frame.weather?.length)
    userCommentParts.push(`Weather: ${frame.weather.map(weatherLabel).join(", ")}`);
  if (frame.notes) userCommentParts.push(`Notes: ${frame.notes}`);

  return {
    scanFileName: frame.scanFileName,
    frameNumber: frame.frameNumber,
    make: camera?.make,
    model: camera?.model,
    serialNumber: camera?.serial,
    lensMake: lens?.make,
    lensModel: lens ? `${lens.make} ${lens.model}`.trim() : undefined,
    focalLengthMm,
    fNumber: parseAperture(frame.aperture),
    exposureTimeSeconds: parseShutterSeconds(frame.shutterSpeed),
    shutterLabel: frame.shutterSpeed,
    iso: iso || undefined,
    filmDescription,
    title: frame.title,
    description: frame.description,
    keywords: [...keywords],
    dateTakenIso: frame.dateTaken || roll?.dateLoaded,
    location: frame.location,
    gps: frame.gps,
    artist,
    copyright,
    software: settings?.softwareTag || "Analog Metadata",
    userComment: userCommentParts.join(" | ") || undefined,
  };
}
