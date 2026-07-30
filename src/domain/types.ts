/**
 * Domain model for the analog film logbook.
 *
 * The model mirrors how a physical film logbook works:
 *   - Some facts belong to the *camera* (make, model) and the *lens*.
 *   - Some facts belong to the whole *roll* of film (film stock, ISO, the lab,
 *     push/pull, the developer).
 *   - Some facts belong to a single *frame* / exposure (aperture, shutter
 *     speed, subject, the lens actually used, date, weather, location).
 *
 * When exporting we flatten camera + lens + roll + frame into one metadata
 * record per scanned image (see core/mapping.ts).
 */

export type Id = string;

/** ISO 8601 timestamp string, e.g. "2026-07-30T14:05:00.000Z". */
export type Iso8601 = string;

export type FilmFormat = "135" | "120" | "220" | "110" | "4x5" | "8x10" | "other";

export type FilmType = "color-negative" | "color-slide" | "black-and-white" | "other";

export type DevelopmentProcess = "C-41" | "E-6" | "BW" | "ECN-2" | "other";

export interface Camera {
  id: Id;
  make: string;
  model: string;
  /** Free-form serial number, engraving, nickname etc. */
  serial?: string;
  format: FilmFormat;
  notes?: string;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export interface Lens {
  id: Id;
  make: string;
  model: string;
  serial?: string;
  /** Prime focal length in mm, or the label for a zoom (e.g. "24-70"). */
  focalLength?: string;
  /** Widest aperture, e.g. "2.8". */
  maxAperture?: string;
  notes?: string;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

/** A film stock definition (a product), reused across many rolls. */
export interface FilmStock {
  id: Id;
  brand: string;
  name: string;
  /** Box speed, e.g. 400. */
  iso: number;
  type: FilmType;
  format: FilmFormat;
  process: DevelopmentProcess;
  notes?: string;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

/**
 * A physical roll of film loaded into a camera. This is the unit the user
 * scans and assigns frames to. Per-roll facts are captured once here.
 */
export interface Roll {
  id: Id;
  /** Short human label, e.g. "Portra #14" or a roll code written on the canister. */
  label: string;
  cameraId?: Id;
  filmStockId?: Id;
  /** Nominal exposure count (24, 36 …). Frames may be fewer or more. */
  frameCount: number;
  /**
   * Effective shooting ISO if the film was pushed/pulled. Empty = box speed.
   * e.g. Portra 400 shot at 800 => pushExposureIndex = 800.
   */
  pushExposureIndex?: number;
  dateLoaded?: Iso8601;
  dateFinished?: Iso8601;
  lab?: string;
  developer?: string;
  /** Copyright / creator applied to every frame of the roll. */
  artist?: string;
  copyright?: string;
  notes?: string;
  /**
   * Reference photos of the handwritten log page(s), stored as data URLs so the
   * user can read their notes while assigning. Kept small; optional.
   */
  logPhotos?: LogPhoto[];
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export interface LogPhoto {
  id: Id;
  /** data: URL of the captured page image. */
  dataUrl: string;
  caption?: string;
  createdAt: Iso8601;
}

/** Weather conditions offered as quick-pick chips; free text also allowed. */
export type Weather =
  | "sunny"
  | "partly-cloudy"
  | "overcast"
  | "rain"
  | "snow"
  | "fog"
  | "golden-hour"
  | "blue-hour"
  | "night"
  | "indoor"
  | "flash";

/** A single exposure on a roll. */
export interface Frame {
  id: Id;
  rollId: Id;
  /** 1-based frame number as written in the log. */
  frameNumber: number;
  lensId?: Id;
  /** f-number as a string to preserve exact notation, e.g. "5.6", "11". */
  aperture?: string;
  /** Shutter speed as written, e.g. "1/125", "2", "B". */
  shutterSpeed?: string;
  /** Focal length used in mm if a zoom; overrides the lens default. */
  focalLength?: string;
  /** Short title / subject line. Maps to XMP dc:title & IPTC Headline. */
  title?: string;
  /** Longer caption. Maps to dc:description / IPTC Caption. */
  description?: string;
  keywords?: string[];
  weather?: Weather[];
  /** When the frame was actually shot (may differ from scan/load date). */
  dateTaken?: Iso8601;
  /** Free-text place, e.g. "Hamburg, Speicherstadt". Maps to IPTC Sublocation/City. */
  location?: string;
  gps?: GpsCoordinate;
  notes?: string;
  /**
   * The scan this frame is linked to. `scanFileName` is what we name the XMP
   * sidecar after (scan.jpg -> scan.xmp) so Lightroom / Capture One pick it up.
   */
  scanFileName?: string;
  /** Optional preview of the linked scan (thumbnail data URL). */
  scanThumbUrl?: string;
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

export interface GpsCoordinate {
  /** Decimal degrees, north positive. */
  lat: number;
  /** Decimal degrees, east positive. */
  lon: number;
  /** Metres above sea level, optional. */
  alt?: number;
}

/** App-wide preferences persisted locally. */
export interface Settings {
  id: "singleton";
  defaultArtist?: string;
  defaultCopyright?: string;
  /** Preferred measurement/date locale for booklet printing. */
  locale?: string;
  /** Software tag written into metadata. */
  softwareTag: string;
  /** Light-meter calibration offset in EV (matches the camera assist to reality). */
  meterCalibrationEv?: number;
}
