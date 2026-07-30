/** Plain CSV export of resolved frame metadata — for spreadsheets and archives. */
import type { ResolvedMetadata } from "./mapping";

const COLUMNS: { header: string; get: (m: ResolvedMetadata) => string }[] = [
  { header: "Scan file", get: (m) => m.scanFileName ?? "" },
  { header: "Frame", get: (m) => String(m.frameNumber) },
  { header: "Title", get: (m) => m.title ?? "" },
  { header: "Description", get: (m) => m.description ?? "" },
  { header: "Camera", get: (m) => [m.make, m.model].filter(Boolean).join(" ") },
  { header: "Lens", get: (m) => m.lensModel ?? "" },
  { header: "Focal length (mm)", get: (m) => (m.focalLengthMm ?? "").toString() },
  { header: "Aperture", get: (m) => (m.fNumber !== undefined ? `f/${m.fNumber}` : "") },
  { header: "Shutter", get: (m) => m.shutterLabel ?? "" },
  { header: "ISO", get: (m) => (m.iso ?? "").toString() },
  { header: "Film", get: (m) => m.filmDescription ?? "" },
  { header: "Date taken", get: (m) => m.dateTakenIso ?? "" },
  { header: "Location", get: (m) => m.location ?? "" },
  { header: "GPS", get: (m) => (m.gps ? `${m.gps.lat},${m.gps.lon}` : "") },
  { header: "Keywords", get: (m) => m.keywords.join("; ") },
  { header: "Artist", get: (m) => m.artist ?? "" },
  { header: "Copyright", get: (m) => m.copyright ?? "" },
];

function cell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function framesToCsv(records: ResolvedMetadata[]): string {
  const header = COLUMNS.map((c) => cell(c.header)).join(",");
  const rows = records.map((m) => COLUMNS.map((c) => cell(c.get(m))).join(","));
  return [header, ...rows].join("\n");
}
