import { describe, expect, it } from "vitest";
import { buildXmp, sidecarName } from "./xmp";
import type { ResolvedMetadata } from "./mapping";

const base: ResolvedMetadata = {
  frameNumber: 5,
  make: "Nikon",
  model: "FM2",
  lensModel: "Nikon 50mm f/1.8",
  focalLengthMm: 50,
  fNumber: 5.6,
  exposureTimeSeconds: 1 / 125,
  iso: 800,
  title: "Harbour crane",
  description: "Speicherstadt at dusk",
  keywords: ["hamburg", "Kodak Portra 400"],
  dateTakenIso: "2026-05-01T18:30:00.000Z",
  location: "Hamburg",
  artist: "Jane Doe",
  copyright: "© 2026 Jane Doe",
  software: "Analog Metadata 0.1",
  gps: { lat: 53.5417, lon: 9.9884 },
};

describe("sidecarName", () => {
  it("swaps the extension for .xmp", () => {
    expect(sidecarName("img_005.tif")).toBe("img_005.xmp");
    expect(sidecarName("scan.jpeg")).toBe("scan.xmp");
    expect(sidecarName("noext")).toBe("noext.xmp");
  });
});

describe("buildXmp", () => {
  const xmp = buildXmp(base);

  it("is a well-formed xpacket with rdf root", () => {
    expect(xmp).toContain("<?xpacket begin=");
    expect(xmp).toContain("<x:xmpmeta");
    expect(xmp).toContain("<rdf:RDF");
    expect(xmp.trim().endsWith('<?xpacket end="w"?>')).toBe(true);
  });

  it("writes camera, lens and exposure fields", () => {
    expect(xmp).toContain("<tiff:Make>Nikon</tiff:Make>");
    expect(xmp).toContain("<tiff:Model>FM2</tiff:Model>");
    // 56/10 reduced by gcd -> 28/5 (both equal f/5.6, valid XMP rationals).
    expect(xmp).toContain("<exif:FNumber>28/5</exif:FNumber>");
    expect(xmp).toContain("<exif:ExposureTime>1/125</exif:ExposureTime>");
    expect(xmp).toContain("<exif:FocalLength>50/1</exif:FocalLength>");
    expect(xmp).toContain("<aux:Lens>Nikon 50mm f/1.8</aux:Lens>");
  });

  it("writes ISO as an ordered array", () => {
    expect(xmp).toContain("<exif:ISOSpeedRatings>");
    expect(xmp).toContain("<rdf:li>800</rdf:li>");
  });

  it("writes keywords as a bag", () => {
    expect(xmp).toContain("<dc:subject>");
    expect(xmp).toContain("<rdf:li>hamburg</rdf:li>");
  });

  it("encodes GPS as degrees/decimal-minutes with hemisphere", () => {
    expect(xmp).toMatch(/<exif:GPSLatitude>53,32\.\d+N<\/exif:GPSLatitude>/);
    expect(xmp).toMatch(/<exif:GPSLongitude>9,59\.\d+E<\/exif:GPSLongitude>/);
  });

  it("escapes special characters", () => {
    const x = buildXmp({ ...base, title: "A & B <c>" });
    expect(x).toContain("A &amp; B &lt;c&gt;");
  });

  it("omits fields that are absent", () => {
    const minimal = buildXmp({
      frameNumber: 1, keywords: [], software: "x",
    });
    expect(minimal).not.toContain("tiff:Make");
    expect(minimal).not.toContain("exif:FNumber");
    expect(minimal).not.toContain("dc:subject");
  });
});
