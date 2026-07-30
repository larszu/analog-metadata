import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import piexif from "piexifjs";
import { buildExportZip } from "./export";
import { embedExif } from "./exif";
import type { ResolvedMetadata } from "./mapping";

// A valid 2×2 white JPEG (generated with Pillow), used to exercise real EXIF
// read/write round-tripping through piexif.
const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL" +
  "DBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIA" +
  "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQID" +
  "AAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpT" +
  "VFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG" +
  "x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcI" +
  "CQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYk" +
  "NOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOU" +
  "lZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oA" +
  "DAMBAAIRAxEAPwD3+iiigD//2Q==";

const resolved: ResolvedMetadata = {
  frameNumber: 1,
  scanFileName: "frame_01.jpg",
  make: "Nikon",
  model: "FM2",
  lensModel: "Nikon 50mm f/1.8",
  fNumber: 5.6,
  exposureTimeSeconds: 1 / 125,
  iso: 400,
  focalLengthMm: 50,
  title: "Test",
  keywords: ["film"],
  software: "Analog Metadata test",
};

describe("embedExif", () => {
  it("writes tags that read back from the JPEG", () => {
    const out = embedExif(TINY_JPEG, resolved);
    expect(out.startsWith("data:image/jpeg;base64,")).toBe(true);
    const dict = piexif.load(out);
    expect(dict["0th"][piexif.ImageIFD.Make]).toBe("Nikon");
    expect(dict["0th"][piexif.ImageIFD.Model]).toBe("FM2");
    expect(dict["Exif"][piexif.ExifIFD.ISOSpeedRatings]).toBe(400);
  });
});

describe("buildExportZip", () => {
  it("bundles sidecars, an embedded JPEG, csv and readme", async () => {
    const result = await buildExportZip("My Roll", [
      { resolved, scanDataUrl: TINY_JPEG },
      {
        resolved: { ...resolved, frameNumber: 2, scanFileName: "frame_02.tif" },
        // no bytes -> sidecar only
      },
    ]);
    expect(result.sidecarCount).toBe(2);
    expect(result.embeddedCount).toBe(1);

    const zip = await JSZip.loadAsync(result.blob);
    const names = Object.keys(zip.files);
    expect(names).toContain("frame_01.xmp");
    expect(names).toContain("frame_02.xmp");
    expect(names).toContain("scans/frame_01.jpg");
    expect(names).toContain("metadata.csv");
    expect(names).toContain("READ-ME.txt");

    const xmp = await zip.file("frame_01.xmp")!.async("string");
    expect(xmp).toContain("<tiff:Make>Nikon</tiff:Make>");
  });

  it("reports frames with no linked scan as skipped", async () => {
    const result = await buildExportZip("R", [
      { resolved: { ...resolved, scanFileName: undefined } },
    ]);
    expect(result.sidecarCount).toBe(0);
    expect(result.skipped.length).toBe(1);
  });
});
