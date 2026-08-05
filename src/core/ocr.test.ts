import { describe, expect, it } from "vitest";
import {
  matchLensByFocalLength,
  normalizeAperture,
  normalizeFocalLength,
  normalizeShutter,
  normalizeWeather,
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

  it("reads a full six-column row (# f/ time lens subject wx)", () => {
    const s = parseOcrLine("1 5.6 1/125 50mm harbour crane overcast");
    expect(s.frameNumber).toBe(1);
    expect(s.aperture).toBe("5.6");
    expect(s.shutter).toBe("1/125");
    expect(s.focalLength).toBe("50");
    expect(s.subject).toBe("harbour crane");
    expect(s.weather).toEqual(["overcast"]);
  });

  it("keeps the lens out of the exposure columns", () => {
    // "35mm" must not be read as an aperture or shutter
    const s = parseOcrLine("2 8 1/250 35mm bridge sunny");
    expect(s.aperture).toBe("8");
    expect(s.shutter).toBe("1/250");
    expect(s.focalLength).toBe("35");
    expect(s.weather).toEqual(["sunny"]);
  });

  it("repairs a merged frame+aperture using the roll's expected frames", () => {
    // Observed with real Tesseract: "1 5.6 …" comes back as "15.6 …"
    const expectedFrames = [1, 2, 3, 4, 5, 6];
    const a = parseOcrLine("15.6 1/125 50mm harbour crane overcast", { expectedFrames });
    expect(a.frameNumber).toBe(1);
    expect(a.aperture).toBe("5.6");

    const b = parseOcrLine("32.8 1/60 50mm cafe indoor", { expectedFrames });
    expect(b.frameNumber).toBe(3);
    expect(b.aperture).toBe("2.8");

    const c = parseOcrLine("54 1/125 50mm portrait flash", { expectedFrames });
    expect(c.frameNumber).toBe(5);
    expect(c.aperture).toBe("4");
  });

  it("never invents a split when the frame isn't expected", () => {
    // 9 is not a frame on this roll, so "95.6" stays as-is rather than becoming 9 + 5.6
    const s = parseOcrLine("95.6 1/125 bridge", { expectedFrames: [1, 2, 3] });
    expect(s.frameNumber).toBeUndefined();
  });

  it("handles a subject-only row", () => {
    const s = parseOcrLine("portrait of Ana");
    expect(s.frameNumber).toBeUndefined();
    expect(s.subject).toContain("portrait");
  });
});

describe("normalizeFocalLength", () => {
  it("reads the Lens column", () => {
    expect(normalizeFocalLength("50mm")).toBe("50");
    expect(normalizeFocalLength("50 mm")).toBe("50");
    expect(normalizeFocalLength("24-70mm")).toBe("24-70");
  });
  it("requires the mm suffix so it can't eat an aperture/shutter", () => {
    expect(normalizeFocalLength("50")).toBeUndefined();
    expect(normalizeFocalLength("1/125")).toBeUndefined();
  });
});

describe("normalizeWeather", () => {
  it("maps the Wx vocabulary", () => {
    expect(normalizeWeather("sunny")).toBe("sunny");
    expect(normalizeWeather("OC")).toBe("overcast");
    expect(normalizeWeather("rain,")).toBe("rain");
    expect(normalizeWeather("indoor")).toBe("indoor");
  });
  it("ignores ordinary subject words", () => {
    expect(normalizeWeather("crane")).toBeUndefined();
    expect(normalizeWeather("beach")).toBeUndefined();
  });
});

describe("suggestionToPatch", () => {
  it("maps only the fields it has to frame keys", () => {
    expect(
      suggestionToPatch({ raw: "", aperture: "5.6", shutter: "1/125", focalLength: "50", weather: ["overcast"], subject: "crane" }),
    ).toEqual({ aperture: "5.6", shutterSpeed: "1/125", focalLength: "50", weather: ["overcast"], title: "crane" });
    expect(suggestionToPatch({ raw: "", frameNumber: 3 })).toEqual({});
  });
});

describe("matchLensByFocalLength", () => {
  const lenses = [
    { id: "l1", focalLength: "50" },
    { id: "l2", focalLength: "35" },
  ];
  it("resolves a recognised focal length to a library lens", () => {
    expect(matchLensByFocalLength("50", lenses)?.id).toBe("l1");
  });
  it("returns undefined when nothing matches", () => {
    expect(matchLensByFocalLength("135", lenses)).toBeUndefined();
    expect(matchLensByFocalLength(undefined, lenses)).toBeUndefined();
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
