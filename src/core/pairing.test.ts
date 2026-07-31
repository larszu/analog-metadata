import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  concatChunks,
  decodeSignal,
  encodeSignal,
  makeMeta,
  sliceIntoChunks,
} from "./pairing";

describe("signal encode/decode", () => {
  it("round-trips an offer", () => {
    const s = decodeSignal(encodeSignal("offer", "v=0..."));
    expect(s.kind).toBe("offer");
    expect(s.sdp).toBe("v=0...");
  });
  it("rejects non-pairing text and foreign payloads", () => {
    expect(() => decodeSignal("nope")).toThrow(/pairing code/);
    expect(() => decodeSignal(JSON.stringify({ app: "x", kind: "offer", sdp: "y" }))).toThrow(/Unrecognised/);
  });
});

describe("chunking", () => {
  it("splits and reassembles bytes losslessly", () => {
    const data = new Uint8Array(1000).map((_, i) => i % 256);
    const chunks = sliceIntoChunks(data, 256);
    expect(chunks.length).toBe(4);
    const back = concatChunks(chunks);
    expect(back).toEqual(data);
  });
  it("handles data smaller than one chunk", () => {
    const data = new Uint8Array([1, 2, 3]);
    expect(sliceIntoChunks(data, 1024)).toHaveLength(1);
  });
  it("meta reports the chunk count", () => {
    const meta = makeMeta("page.jpg", "image/jpeg", new Uint8Array(40000), 16 * 1024);
    expect(meta.chunks).toBe(3);
    expect(meta.size).toBe(40000);
  });
});

describe("base64 round-trip", () => {
  it("survives arbitrary bytes", () => {
    const data = new Uint8Array([0, 1, 2, 254, 255, 128, 64]);
    expect(base64ToBytes(bytesToBase64(data))).toEqual(data);
  });
});
