import { describe, expect, it } from "vitest";
import {
  normalizeAperture,
  normalizeShutter,
  parseFrameNumber,
  parseOcrLine,
  parseOcrLines,
  suggestionToPatch,
} from "./ocr";

describe("normalizeAperture", () => {
  it("keeps decimals and whole stops", () => {
    expect(normalizeAperture("5.6")).toBe("5.6");
    expect(normalizeAperture("f/8")).toBe("8");
    expect(normalizeAperture("F2,8")).toBe("2.8");
    expect(normalizeAperture("11")).toBe("11");
  });
  it("recovers OCR-dropped decimals", () => {
    expect(normalizeAperture("56")).toBe("5.6");
    expect(normalizeAperture("28")).toBe("2.8");
  });
  it("rejects shutter-like and junk tokens", () => {
    expect(normalizeAperture("1/125")).toBeUndefined();
    expect(normalizeAperture("crane")).toBeUndefined();
  });
});

describe("normalizeShutter", () => {
  it("normalises fraction notations", () => {
    expect(normalizeShutter("1/125")).toBe("1/125");
    expect(normalizeShutter("1-250")).toBe("1/250");
    expect(normalizeShutter("l/60")).toBe("1/60"); // OCR read "1" as "l"
  });
  it("expands bare dial denominators", () => {
    expect(normalizeShutter("125")).toBe("1/125");
    expect(normalizeShutter("500")).toBe("1/500");
  });
  it("keeps whole seconds and bulb", () => {
    expect(normalizeShutter("B")).toBe("B");
    expect(normalizeShutter("2s")).toBe("2");
  });
  it("rejects junk", () => {
    expect(normalizeShutter("crane")).toBeUndefined();
  });
});

describe("parseFrameNumber", () => {
  it("reads a leading frame number", () => {
    expect(parseFrameNumber("5")).toBe(5);
    expect(parseFrameNumber("12")).toBe(12);
    expect(parseFrameNumber("x")).toBeUndefined();
  });
});

describe("parseOcrLine", () => {
  it("maps a typical row in column order", () => {
    const s = parseOcrLine("5 5.6 1/125 harbour crane");
    expect(s.frameNumber).toBe(5);
    expect(s.aperture).toBe("5.6");
    expect(s.shutter).toBe("1/125");
    expect(s.subject).toBe("harbour crane");
  });

  it("resolves the f/8-vs-1/8 ambiguity by position (f/ column first)", () => {
    const s = parseOcrLine("3 8 125 bridge");
    expect(s.aperture).toBe("8"); // first numeric → aperture
    expect(s.shutter).toBe("1/125"); // next → shutter
    expect(s.subject).toBe("bridge");
  });

  it("recovers a dropped aperture dot from a real-ish scan", () => {
    const s = parseOcrLine("7 56 1/250 skyline");
    expect(s.aperture).toBe("5.6");
    expect(s.shutter).toBe("1/250");
  });

  it("handles a subject-only row", () => {
    const s = parseOcrLine("portrait of Ana");
    expect(s.frameNumber).toBeUndefined();
    expect(s.subject).toContain("portrait");
  });
});

describe("suggestionToPatch", () => {
  it("maps only the fields it has to frame keys", () => {
    expect(suggestionToPatch({ raw: "", aperture: "5.6", shutter: "1/125", subject: "crane" }))
      .toEqual({ aperture: "5.6", shutterSpeed: "1/125", title: "crane" });
    expect(suggestionToPatch({ raw: "", frameNumber: 3 })).toEqual({});
  });
});

describe("parseOcrLines", () => {
  it("keeps only rows that yielded something", () => {
    const rows = parseOcrLines(["1 8 1/60 cafe", "   ", "garbage___", "2 11 1/250 street"]);
    expect(rows).toHaveLength(3); // two full rows + the "garbage" alpha as a subject
    expect(rows[0].frameNumber).toBe(1);
    expect(rows[rows.length - 1].frameNumber).toBe(2);
  });
});
