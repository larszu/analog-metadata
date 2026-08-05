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
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

const MM = 2.834645669; // points per millimetre

/**
 * QR back-linking: a booklet printed for a roll carries a QR on every sheet
 * encoding that roll, so photographing the sheet later re-opens the right roll.
 */
export const ROLL_QR_PREFIX = "analogmeta:roll:";

export function rollQrPayload(rollId: string): string {
  return `${ROLL_QR_PREFIX}${rollId}`;
}

export function parseRollQr(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed.startsWith(ROLL_QR_PREFIX) ? trimmed.slice(ROLL_QR_PREFIX.length) : undefined;
}
const A6 = { w: 105 * MM, h: 148 * MM };
const A4_LANDSCAPE = { w: 297 * MM, h: 210 * MM };

/** Paper sizes for the one-sheet-per-page layout (portrait, in mm). */
export type PageSize = "A6" | "A5" | "A4" | "Letter";
export const PAGE_SIZES: Record<PageSize, { w: number; h: number }> = {
  A6: { w: 105 * MM, h: 148 * MM },
  A5: { w: 148 * MM, h: 210 * MM },
  A4: { w: 210 * MM, h: 297 * MM },
  Letter: { w: 215.9 * MM, h: 279.4 * MM },
};

export interface BookletOptions {
  /** "single" = one sheet per page (sized by `pageSize`); "a4-2up" = 2×A6 on A4. */
  layout?: "single" | "a4-2up" | "a6";
  /** Paper size for the single-sheet layout. Ignored for a4-2up. */
  pageSize?: PageSize;
  /** Rows (frames) per sheet. Extra frames spill onto additional sheets. */
  framesPerSheet?: number;
  /** How many sheets/pages of blank log to produce. */
  sheets?: number;
  title?: string;
  /** Pre-fill the header fields (e.g. from a selected camera/roll/lens). */
  camera?: string;
  film?: string;
  lens?: string;
  iso?: string;
  date?: string;
  /** When set, a QR of this string is stamped on every sheet (roll back-link). */
  qrData?: string;
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
  qrImage?: PDFImage,
) {
  const margin = 8 * MM;
  const left = ox + margin;
  const right = ox + w - margin;
  const usable = right - left;
  let y = oy + h - margin;

  // Roll back-link QR in the top-right corner.
  if (qrImage) {
    const qrSize = 12 * MM;
    page.drawImage(qrImage, { x: right - qrSize, y: oy + h - margin - qrSize, width: qrSize, height: qrSize });
  }

  // Title
  page.drawText(opts.title || "Film log", {
    x: left,
    y: y - 9,
    size: 11,
    font: fonts.bold,
    color: INK,
  });
  y -= 16;

  // Header fields (recorded once per roll). Lens sits here too since it's often
  // one lens for the whole roll; per-frame lens changes go in the table column.
  const headerFields: [string, string][] = [
    ["Camera", opts.camera || ""],
    ["Film", opts.film || ""],
    ["Lens", opts.lens || ""],
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
  const headerRows = Math.ceil(headerFields.length / 2);
  y -= (headerRows - 1) * 12 + 8;

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
  // "a6" kept as a backwards-compatible alias for the single-sheet layout.
  const layout = opts.layout === "a4-2up" ? "a4-2up" : "single";
  const size = PAGE_SIZES[opts.pageSize ?? "A6"];
  const framesPerSheet = opts.framesPerSheet ?? 12;
  const sheets = Math.max(1, opts.sheets ?? 3);

  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  let qrImage: PDFImage | undefined;
  if (opts.qrData) {
    const pngDataUrl = await QRCode.toDataURL(opts.qrData, { margin: 0, width: 160 });
    qrImage = await doc.embedPng(pngDataUrl);
  }

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
          qrImage,
        );
        frame += framesPerSheet;
      }
    }
  } else {
    for (let s = 0; s < sheets; s++) {
      const page = doc.addPage([size.w, size.h]);
      drawSheet(page, fonts, 0, 0, size.w, size.h, opts, frame, framesPerSheet, qrImage);
      frame += framesPerSheet;
    }
  }

  return doc.save();
}
