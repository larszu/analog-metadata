/**
 * Builds an XMP sidecar (.xmp) for a scanned frame.
 *
 * XMP sidecars are the lingua franca of the desktop RAW/scan workflow: both
 * Adobe Lightroom Classic and Capture One read a `<basename>.xmp` file sitting
 * next to `<basename>.tif/.jpg` and merge its fields on import. Writing sidecars
 * (rather than mutating the scans) is non-destructive and works for TIFF/DNG
 * scans that we cannot easily re-encode in the browser.
 *
 * Namespaces chosen for maximum cross-app pickup:
 *   dc          — title, caption, keywords, creator, rights
 *   xmp         — CreateDate / ModifyDate / CreatorTool
 *   photoshop   — DateCreated, Headline (Capture One + Lightroom)
 *   exif        — FNumber, ExposureTime, ISO, FocalLength, GPS, DateTimeOriginal
 *   exifEX      — LensModel / LensMake (EXIF 2.3 lens tags)
 *   aux         — Lens (the field Lightroom shows in its Lens metadata slot)
 *   tiff        — Make / Model
 *   Iptc4xmpCore— Location
 */
import type { ResolvedMetadata } from "./mapping";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format a decimal as an XMP rational "num/den" with a sensible denominator. */
function rational(value: number, denom = 1000): string {
  const num = Math.round(value * denom);
  const g = gcd(Math.abs(num), denom);
  return `${num / g}/${denom / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a || 1 : gcd(b, a % b);
}

function exposureRational(seconds: number): string {
  if (seconds >= 1) return rational(seconds, 1);
  const denom = Math.round(1 / seconds);
  return `1/${denom}`;
}

/** exif:DateTimeOriginal wants "YYYY-MM-DDThh:mm:ss" (local, no ms). */
function xmpDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** GPS in XMP: "deg,min.decimalHemisphere" e.g. "53,33.123N". */
function gpsCoord(value: number, positive: string, negative: string): string {
  const hemi = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${deg},${min.toFixed(6)}${hemi}`;
}

function bagOrSeq(tag: string, items: string[], kind: "Bag" | "Seq"): string {
  if (items.length === 0) return "";
  const li = items
    .map((i) => `        <rdf:li>${esc(i)}</rdf:li>`)
    .join("\n");
  return `    <${tag}>
      <rdf:${kind}>
${li}
      </rdf:${kind}>
    </${tag}>\n`;
}

/** A localized alt-text property (dc:title / dc:description). */
function altText(tag: string, value: string): string {
  return `    <${tag}>
      <rdf:Alt>
        <rdf:li xml:lang="x-default">${esc(value)}</rdf:li>
      </rdf:Alt>
    </${tag}>\n`;
}

export function buildXmp(m: ResolvedMetadata): string {
  let props = "";

  if (m.title) props += altText("dc:title", m.title);
  if (m.description) props += altText("dc:description", m.description);
  if (m.keywords.length) props += bagOrSeq("dc:subject", m.keywords, "Bag");
  if (m.artist) props += bagOrSeq("dc:creator", [m.artist], "Seq");
  if (m.copyright) props += altText("dc:rights", m.copyright);

  props += `    <xmp:CreatorTool>${esc(m.software)}</xmp:CreatorTool>\n`;
  props += `    <xmp:MetadataDate>${xmpDate(new Date().toISOString())}</xmp:MetadataDate>\n`;

  if (m.dateTakenIso) {
    const d = xmpDate(m.dateTakenIso);
    props += `    <xmp:CreateDate>${d}</xmp:CreateDate>\n`;
    props += `    <photoshop:DateCreated>${d}</photoshop:DateCreated>\n`;
    props += `    <exif:DateTimeOriginal>${d}</exif:DateTimeOriginal>\n`;
  }

  if (m.title) props += `    <photoshop:Headline>${esc(m.title)}</photoshop:Headline>\n`;

  if (m.make) props += `    <tiff:Make>${esc(m.make)}</tiff:Make>\n`;
  if (m.model) props += `    <tiff:Model>${esc(m.model)}</tiff:Model>\n`;

  if (m.fNumber !== undefined)
    props += `    <exif:FNumber>${rational(m.fNumber, 10)}</exif:FNumber>\n`;
  if (m.exposureTimeSeconds !== undefined)
    props += `    <exif:ExposureTime>${exposureRational(m.exposureTimeSeconds)}</exif:ExposureTime>\n`;
  if (m.iso !== undefined) {
    // exif:ISOSpeedRatings is an ordered array in the EXIF schema.
    props += bagOrSeq("exif:ISOSpeedRatings", [String(Math.round(m.iso))], "Seq");
  }
  if (m.focalLengthMm !== undefined)
    props += `    <exif:FocalLength>${rational(m.focalLengthMm, 1)}</exif:FocalLength>\n`;

  if (m.lensModel) {
    props += `    <exifEX:LensModel>${esc(m.lensModel)}</exifEX:LensModel>\n`;
    props += `    <aux:Lens>${esc(m.lensModel)}</aux:Lens>\n`;
  }
  if (m.lensMake) props += `    <exifEX:LensMake>${esc(m.lensMake)}</exifEX:LensMake>\n`;
  if (m.serialNumber)
    props += `    <exifEX:BodySerialNumber>${esc(m.serialNumber)}</exifEX:BodySerialNumber>\n`;

  if (m.location)
    props += `    <Iptc4xmpCore:Location>${esc(m.location)}</Iptc4xmpCore:Location>\n`;

  if (m.gps) {
    props += `    <exif:GPSLatitude>${esc(gpsCoord(m.gps.lat, "N", "S"))}</exif:GPSLatitude>\n`;
    props += `    <exif:GPSLongitude>${esc(gpsCoord(m.gps.lon, "E", "W"))}</exif:GPSLongitude>\n`;
    if (m.gps.alt !== undefined)
      props += `    <exif:GPSAltitude>${rational(Math.abs(m.gps.alt), 1)}</exif:GPSAltitude>\n`;
  }

  if (m.userComment)
    props += `    <exif:UserComment>${esc(m.userComment)}</exif:UserComment>\n`;

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Analog Metadata">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:exifEX="http://cipa.jp/exif/1.0/"
    xmlns:aux="http://ns.adobe.com/exif/1.0/aux/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
${props}  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Sidecar file name for a scan: "img_001.tif" -> "img_001.xmp". */
export function sidecarName(scanFileName: string): string {
  const dot = scanFileName.lastIndexOf(".");
  const base = dot > 0 ? scanFileName.slice(0, dot) : scanFileName;
  return `${base}.xmp`;
}
