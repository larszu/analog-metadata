/**
 * Generates printable DIN A6 film-log sheets as a PDF.
 *
 * Two layouts:
 *   - "a6"  : one A6 page per sheet (print at 100%, or use "4 pages per sheet"
 *             in the print dialog to get 4×A6 on one A4).
 *   - "a4-2up": two A6 log pages imposed side by side on a landscape A4, with a
 *             centre fold line — cut/fold into an A6 booklet.
 *
 * Each sheet has a header block for the facts you record once per roll/camera
 * (camera, film, ISO, date, developer …) and a table of frame rows with narrow
 * columns for the per-frame facts (aperture, shutter, lens, subject, weather).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const MM = 2.834645669; // points per millimetre
const A6 = { w: 105 * MM, h: 148 * MM };
const A4_LANDSCAPE = { w: 297 * MM, h: 210 * MM };

export interface BookletOptions {
  layout?: "a6" | "a4-2up";
  /** Rows (frames) per sheet. Extra frames spill onto additional sheets. */
  framesPerSheet?: number;
  /** How many sheets/pages of blank log to produce. */
  sheets?: number;
  title?: string;
  /** Pre-fill the header fields (e.g. from a selected camera/roll). */
  camera?: string;
  film?: string;
  iso?: string;
  date?: string;
}

interface Column {
  key: string;
  label: string;
  /** Relative width weight. */
  w: number;
}

const COLUMNS: Column[] = [
  { key: "no", label: "#", w: 0.7 },
  { key: "f", label: "f/", w: 1.0 },
  { key: "t", label: "Time", w: 1.4 },
  { key: "lens", label: "Lens", w: 1.8 },
  { key: "subject", label: "Subject", w: 3.6 },
  { key: "wx", label: "Wx", w: 1.1 },
];

const GREY = rgb(0.55, 0.55, 0.55);
const LINE = rgb(0.75, 0.75, 0.75);
const INK = rgb(0.1, 0.1, 0.12);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/** Draw one A6 log sheet at offset (ox, oy) with the given content height h. */
function drawSheet(
  page: PDFPage,
  fonts: Fonts,
  ox: number,
  oy: number,
  w: number,
  h: number,
  opts: BookletOptions,
  startFrame: number,
  rows: number,
) {
  const margin = 8 * MM;
  const left = ox + margin;
  const right = ox + w - margin;
  const usable = right - left;
  let y = oy + h - margin;

  // Title
  page.drawText(opts.title || "Film log", {
    x: left,
    y: y - 9,
    size: 11,
    font: fonts.bold,
    color: INK,
  });
  y -= 16;

  // Header fields (recorded once per roll).
  const headerFields: [string, string][] = [
    ["Camera", opts.camera || ""],
    ["Film", opts.film || ""],
    ["ISO", opts.iso || ""],
    ["Date", opts.date || ""],
  ];
  const colW = usable / 2;
  headerFields.forEach(([label, value], i) => {
    const hx = left + (i % 2) * colW;
    const hy = y - Math.floor(i / 2) * 12;
    page.drawText(`${label}:`, { x: hx, y: hy, size: 7, font: fonts.bold, color: GREY });
    const labelW = fonts.bold.widthOfTextAtSize(`${label}: `, 7);
    if (value) {
      page.drawText(value, { x: hx + labelW, y: hy, size: 7, font: fonts.regular, color: INK });
    } else {
      page.drawLine({
        start: { x: hx + labelW, y: hy - 1 },
        end: { x: hx + colW - 6, y: hy - 1 },
        thickness: 0.4,
        color: LINE,
      });
    }
  });
  y -= 12 + 8;

  // Table header
  const totalW = COLUMNS.reduce((s, c) => s + c.w, 0);
  const xs: number[] = [];
  let cx = left;
  for (const c of COLUMNS) {
    xs.push(cx);
    cx += (c.w / totalW) * usable;
  }
  xs.push(right);

  const headerY = y;
  COLUMNS.forEach((c, i) => {
    page.drawText(c.label, { x: xs[i] + 2, y: headerY - 7, size: 6.5, font: fonts.bold, color: GREY });
  });
  y = headerY - 10;

  // Rows
  const rowH = (y - (oy + margin)) / rows;
  for (let r = 0; r <= rows; r++) {
    const ry = y - r * rowH;
    page.drawLine({
      start: { x: left, y: ry },
      end: { x: right, y: ry },
      thickness: 0.4,
      color: LINE,
    });
    if (r < rows) {
      // frame number pre-printed
      page.drawText(String(startFrame + r), {
        x: xs[0] + 2,
        y: ry - rowH + 3,
        size: 7,
        font: fonts.regular,
        color: INK,
      });
    }
  }
  // vertical column separators
  for (let i = 1; i < xs.length - 1; i++) {
    page.drawLine({
      start: { x: xs[i], y },
      end: { x: xs[i], y: y - rows * rowH },
      thickness: 0.4,
      color: LINE,
    });
  }
  // outer frame around the table
  page.drawLine({ start: { x: left, y: headerY }, end: { x: right, y: headerY }, thickness: 0.6, color: GREY });
}

export async function buildBookletPdf(opts: BookletOptions = {}): Promise<Uint8Array> {
  const layout = opts.layout ?? "a6";
  const framesPerSheet = opts.framesPerSheet ?? 12;
  const sheets = Math.max(1, opts.sheets ?? 3);

  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  let frame = 1;
  if (layout === "a4-2up") {
    // Two A6 sheets per landscape A4 page.
    const perPage = 2;
    for (let s = 0; s < sheets; s += perPage) {
      const page = doc.addPage([A4_LANDSCAPE.w, A4_LANDSCAPE.h]);
      const slotW = A4_LANDSCAPE.w / 2;
      // centre fold line
      page.drawLine({
        start: { x: slotW, y: 0 },
        end: { x: slotW, y: A4_LANDSCAPE.h },
        thickness: 0.4,
        color: LINE,
        dashArray: [3, 3],
      });
      for (let slot = 0; slot < perPage && s + slot < sheets; slot++) {
        drawSheet(
          page,
          fonts,
          slot * slotW + (slotW - A6.w) / 2,
          (A4_LANDSCAPE.h - A6.h) / 2,
          A6.w,
          A6.h,
          opts,
          frame,
          framesPerSheet,
        );
        frame += framesPerSheet;
      }
    }
  } else {
    for (let s = 0; s < sheets; s++) {
      const page = doc.addPage([A6.w, A6.h]);
      drawSheet(page, fonts, 0, 0, A6.w, A6.h, opts, frame, framesPerSheet);
      frame += framesPerSheet;
    }
  }

  return doc.save();
}
