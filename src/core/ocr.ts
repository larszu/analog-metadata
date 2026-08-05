/**
 * Parsing layer for handwriting OCR of a printed log sheet.
 *
 * We print the sheet ourselves with a fixed column order (# · f/ · Time · Lens ·
 * Subject · Wx), so once an OCR engine (Tesseract, client-side) returns the text
 * of each row we can classify the tokens into frame fields deterministically.
 * The engine itself lives in data/ocr.ts; everything here is pure and tested.
 *
 * Handwriting recognition is never perfect, so the output is *suggestions* the
 * user reviews before applying — this layer just does the best-effort mapping.
 */
import type { Weather } from "../domain/types";

/** Common full/half aperture stops, and the dotless forms OCR often produces. */
const APERTURE_DOTLESS: Record<string, string> = {
  "10": "1.0", "12": "1.2", "14": "1.4", "17": "1.7", "24": "2.4", "28": "2.8",
  "35": "3.5", "45": "4.5", "48": "4.8", "56": "5.6", "67": "6.7", "95": "9.5",
};
const APERTURE_WHOLE = new Set(["1", "2", "4", "8", "11", "13", "16", "19", "22", "27", "32", "45", "64"]);

/** Shutter denominators found on a typical dial. */
const SHUTTER_DENOMS = new Set(["2", "4", "8", "15", "30", "60", "125", "250", "500", "1000", "2000", "4000", "8000"]);

/** Normalise an aperture token → decimal f-number string, or undefined. */
export function normalizeAperture(raw: string): string | undefined {
  const s = raw.replace(/^f\/?/i, "").replace(",", ".").trim();
  if (s.includes("/")) return undefined; // that's a shutter, not an aperture
  if (/^\d{1,2}\.\d$/.test(s)) return s; // already decimal, e.g. 5.6
  if (APERTURE_WHOLE.has(s)) return s;
  if (APERTURE_DOTLESS[s]) return APERTURE_DOTLESS[s]; // OCR dropped the dot
  return undefined;
}

/** Normalise a shutter token → dial notation ("1/125", "2", "B"), or undefined. */
export function normalizeShutter(raw: string): string | undefined {
  const s = raw.trim().toUpperCase();
  if (s === "B" || s === "T") return s;
  // 1/125, 1-125, 1|125, l/125 (OCR of "1")
  const frac = s.match(/^[1LI]\s*[/\\|-]\s*(\d{1,4})$/);
  if (frac) return `1/${frac[1]}`;
  const hadSeconds = /S$/.test(s); // explicit "2s" = 2 seconds
  const num = s.replace(/S$/, "");
  if (/^\d{1,4}$/.test(num)) {
    if (hadSeconds) return num;
    if (SHUTTER_DENOMS.has(num)) return `1/${num}`; // bare dial denominator
    const n = Number(num);
    if (n >= 1 && n <= 60) return num; // fall back to whole seconds
  }
  return undefined;
}

/** Leading 1–3 digit frame number, if the token looks like one. */
export function parseFrameNumber(raw: string): number | undefined {
  const m = raw.trim().match(/^(\d{1,3})$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 && n <= 999 ? n : undefined;
}

/**
 * Focal length as written in the printed "Lens" column: "50mm", "50 mm",
 * "24-70mm". The "mm" suffix is required — a bare number would be ambiguous
 * with the aperture and shutter columns.
 */
export function normalizeFocalLength(raw: string): string | undefined {
  const m = raw.trim().toLowerCase().match(/^(\d{1,3}(?:-\d{1,3})?)\s*mm$/);
  return m ? m[1] : undefined;
}

/**
 * Weather words/abbreviations from the "Wx" column. Deliberately a tight
 * vocabulary so ordinary subject words aren't mistaken for conditions.
 */
const WEATHER_WORDS: Record<string, Weather> = {
  sun: "sunny", sunny: "sunny", clear: "sunny",
  pc: "partly-cloudy", partly: "partly-cloudy",
  cloud: "overcast", cloudy: "overcast", overcast: "overcast", oc: "overcast",
  rain: "rain", rainy: "rain",
  snow: "snow", snowy: "snow",
  fog: "fog", foggy: "fog", mist: "fog",
  golden: "golden-hour",
  blue: "blue-hour",
  night: "night",
  indoor: "indoor", inside: "indoor",
  flash: "flash",
};

export function normalizeWeather(raw: string): Weather | undefined {
  return WEATHER_WORDS[raw.trim().toLowerCase().replace(/[.,;:]$/, "")];
}

export interface FrameOcrSuggestion {
  frameNumber?: number;
  aperture?: string;
  shutter?: string;
  /** Focal length from the Lens column, e.g. "50" or "24-70". */
  focalLength?: string;
  weather?: Weather[];
  subject?: string;
  /** The original recognised line, shown in review for context. */
  raw: string;
}

export interface ParseOcrOptions {
  /**
   * Frame numbers actually printed on the sheet (the roll's frames). Supplying
   * them lets us undo the most common OCR artifact: the pre-printed frame
   * number running into the handwritten aperture ("1 5.6" → "15.6").
   */
  expectedFrames?: number[];
}

/**
 * Split a leading token that merged the frame number and the aperture. Only
 * splits when the prefix is a frame number we expect *and* the remainder is a
 * valid aperture, so it can't invent data.
 */
export function splitMergedFrameAperture(
  token: string,
  expected: Set<number>,
): { frame: number; aperture: string } | undefined {
  if (expected.size === 0) return undefined;
  for (let len = 1; len <= 2 && len < token.length; len++) {
    const frame = Number(token.slice(0, len));
    if (!Number.isInteger(frame) || !expected.has(frame)) continue;
    const aperture = normalizeAperture(token.slice(len));
    if (aperture) return { frame, aperture };
  }
  return undefined;
}

/**
 * Classify one recognised row into a frame suggestion. Tokens are consumed in
 * order so the printed column order (f/ before Time) resolves the f/8-vs-1/8
 * ambiguity: the first numeric becomes the aperture, the next the shutter.
 * Lens ("50mm") and weather words are picked out wherever they appear; the
 * remaining words form the subject.
 */
export function parseOcrLine(text: string, opts?: ParseOcrOptions): FrameOcrSuggestion {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const out: FrameOcrSuggestion = { raw: text.trim() };
  if (tokens.length === 0) return out;

  const expected = new Set(opts?.expectedFrames ?? []);
  let i = 0;
  const fn = parseFrameNumber(tokens[0]);
  if (fn !== undefined && (expected.size === 0 || expected.has(fn))) {
    out.frameNumber = fn;
    i = 1;
  } else {
    // The leading token may be "<frame><aperture>" glued together by OCR.
    const split = splitMergedFrameAperture(tokens[0], expected);
    if (split) {
      out.frameNumber = split.frame;
      out.aperture = split.aperture;
      i = 1;
    } else if (fn !== undefined) {
      out.frameNumber = fn;
      i = 1;
    }
  }

  const subjectWords: string[] = [];
  const weather: Weather[] = [];
  for (; i < tokens.length; i++) {
    const tok = tokens[i];
    if (out.focalLength === undefined && normalizeFocalLength(tok)) {
      out.focalLength = normalizeFocalLength(tok);
    } else if (out.aperture === undefined && normalizeAperture(tok)) {
      out.aperture = normalizeAperture(tok);
    } else if (out.shutter === undefined && normalizeShutter(tok)) {
      out.shutter = normalizeShutter(tok);
    } else if (normalizeWeather(tok)) {
      const w = normalizeWeather(tok)!;
      if (!weather.includes(w)) weather.push(w);
    } else if (/[a-zA-ZäöüÄÖÜ]{2,}/.test(tok)) {
      subjectWords.push(tok);
    }
  }
  if (weather.length) out.weather = weather;
  if (subjectWords.length) out.subject = subjectWords.join(" ");
  return out;
}

/** Parse many recognised lines, keeping only rows that yielded something. */
export function parseOcrLines(lines: string[], opts?: ParseOcrOptions): FrameOcrSuggestion[] {
  return lines
    .map((l) => parseOcrLine(l, opts))
    .filter(
      (s) =>
        s.frameNumber !== undefined ||
        s.aperture ||
        s.shutter ||
        s.focalLength ||
        s.weather?.length ||
        s.subject,
    );
}

/** The frame fields a reviewed suggestion writes (only the ones it has). */
export interface FrameOcrPatch {
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  weather?: Weather[];
  title?: string;
}

export function suggestionToPatch(s: FrameOcrSuggestion): FrameOcrPatch {
  const patch: FrameOcrPatch = {};
  if (s.aperture) patch.aperture = s.aperture;
  if (s.shutter) patch.shutterSpeed = s.shutter;
  if (s.focalLength) patch.focalLength = s.focalLength;
  if (s.weather?.length) patch.weather = s.weather;
  if (s.subject) patch.title = s.subject;
  return patch;
}

/**
 * Resolve a recognised focal length to a lens in the library, so "50mm" on the
 * sheet becomes the actual lens record. Matches on the lens's focal length.
 */
export function matchLensByFocalLength<T extends { id: string; focalLength?: string }>(
  focalLength: string | undefined,
  lenses: T[],
): T | undefined {
  if (!focalLength) return undefined;
  const want = focalLength.trim().toLowerCase();
  return lenses.find((l) => (l.focalLength ?? "").trim().toLowerCase() === want);
}
