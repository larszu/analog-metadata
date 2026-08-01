import { describe, expect, it } from "vitest";
import { buildBookletPdf, parseRollQr, rollQrPayload } from "./booklet";

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 5));
}

describe("buildBookletPdf", () => {
  it("produces a valid A6 PDF", async () => {
    const bytes = await buildBookletPdf({ sheets: 3, framesPerSheet: 12 });
    expect(pdfHeader(bytes)).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("produces an A4 2-up imposition", async () => {
    const bytes = await buildBookletPdf({ layout: "a4-2up", sheets: 4 });
    expect(pdfHeader(bytes)).toBe("%PDF-");
  });

  it("accepts pre-filled header fields", async () => {
    const bytes = await buildBookletPdf({
      camera: "Nikon FM2",
      film: "Portra 400",
      iso: "400",
      date: "2026-07-30",
      sheets: 1,
    });
    expect(pdfHeader(bytes)).toBe("%PDF-");
  });

  it("stamps a roll back-link QR when qrData is given", async () => {
    const bytes = await buildBookletPdf({ sheets: 2, qrData: rollQrPayload("roll-123") });
    expect(pdfHeader(bytes)).toBe("%PDF-");
  });
});

describe("roll QR payload", () => {
  it("round-trips a roll id", () => {
    expect(parseRollQr(rollQrPayload("abc-123"))).toBe("abc-123");
  });
  it("ignores foreign codes", () => {
    expect(parseRollQr("https://example.com")).toBeUndefined();
    expect(parseRollQr("analogmeta:roll:")).toBe("");
  });
});
