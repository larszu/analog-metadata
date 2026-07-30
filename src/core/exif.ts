/**
 * Embeds resolved metadata directly into a JPEG scan's EXIF/TIFF headers so the
 * data travels *inside* the file — visible in Windows Explorer, macOS Finder,
 * and any viewer, without a sidecar. Only JPEG can be rewritten in the browser;
 * TIFF/DNG/RAW scans should use the XMP sidecar path instead.
 */
import piexif from "piexifjs";
import type { ResolvedMetadata } from "./mapping";

export function isJpeg(fileName: string): boolean {
  return /\.jpe?g$/i.test(fileName);
}

/** EXIF DateTimeOriginal wants "YYYY:MM:DD HH:MM:SS" in local-ish form. */
function exifDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ratio(value: number, denom: number): [number, number] {
  return [Math.round(value * denom), denom];
}

function exposureRatio(seconds: number): [number, number] {
  if (seconds >= 1) return [Math.round(seconds), 1];
  return [1, Math.round(1 / seconds)];
}

/**
 * Return a new JPEG data URL with metadata embedded.
 * Throws if given a non-JPEG data URL.
 */
export function embedExif(jpegDataUrl: string, m: ResolvedMetadata): string {
  const zeroth: Record<number, unknown> = {};
  const exif: Record<number, unknown> = {};
  const gps: Record<number, unknown> = {};

  if (m.make) zeroth[piexif.ImageIFD.Make] = m.make;
  if (m.model) zeroth[piexif.ImageIFD.Model] = m.model;
  zeroth[piexif.ImageIFD.Software] = m.software;
  if (m.artist) zeroth[piexif.ImageIFD.Artist] = m.artist;
  if (m.copyright) zeroth[piexif.ImageIFD.Copyright] = m.copyright;

  const desc = [m.title, m.description].filter(Boolean).join(" — ");
  if (desc) zeroth[piexif.ImageIFD.ImageDescription] = desc;

  if (m.dateTakenIso) {
    const d = exifDate(m.dateTakenIso);
    if (d) {
      exif[piexif.ExifIFD.DateTimeOriginal] = d;
      exif[piexif.ExifIFD.DateTimeDigitized] = d;
    }
  }
  if (m.fNumber !== undefined) exif[piexif.ExifIFD.FNumber] = ratio(m.fNumber, 10);
  if (m.exposureTimeSeconds !== undefined)
    exif[piexif.ExifIFD.ExposureTime] = exposureRatio(m.exposureTimeSeconds);
  if (m.iso !== undefined) exif[piexif.ExifIFD.ISOSpeedRatings] = Math.round(m.iso);
  if (m.focalLengthMm !== undefined)
    exif[piexif.ExifIFD.FocalLength] = ratio(m.focalLengthMm, 1);
  if (m.lensModel) exif[piexif.ExifIFD.LensModel] = m.lensModel;
  if (m.serialNumber) exif[piexif.ExifIFD.BodySerialNumber] = m.serialNumber;

  if (m.gps) {
    gps[piexif.GPSIFD.GPSLatitudeRef] = m.gps.lat >= 0 ? "N" : "S";
    gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(
      Math.abs(m.gps.lat),
    );
    gps[piexif.GPSIFD.GPSLongitudeRef] = m.gps.lon >= 0 ? "E" : "W";
    gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(
      Math.abs(m.gps.lon),
    );
    if (m.gps.alt !== undefined) {
      gps[piexif.GPSIFD.GPSAltitudeRef] = m.gps.alt >= 0 ? 0 : 1;
      gps[piexif.GPSIFD.GPSAltitude] = ratio(Math.abs(m.gps.alt), 1);
    }
  }

  const exifObj: Record<string, Record<number, unknown>> = {
    "0th": zeroth,
    Exif: exif,
    GPS: gps,
  };
  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, jpegDataUrl);
}
