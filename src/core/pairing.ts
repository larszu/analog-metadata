/**
 * Pure helpers for the wireless phone ⇆ desktop pairing (WebRTC + QR).
 *
 * The transport (RTCPeerConnection, camera QR scanning) lives in the Pair page;
 * here is the serialisable, testable part: the QR signalling payload and the
 * chunking of an image so it can travel over a data channel in bounded pieces.
 */

export type SignalKind = "offer" | "answer";

export interface Signal {
  app: "analog-metadata";
  kind: SignalKind;
  sdp: string;
}

export function encodeSignal(kind: SignalKind, sdp: string): string {
  const payload: Signal = { app: "analog-metadata", kind, sdp };
  return JSON.stringify(payload);
}

export function decodeSignal(text: string): Signal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That QR code isn't a pairing code.");
  }
  const s = parsed as Partial<Signal>;
  if (!s || s.app !== "analog-metadata" || (s.kind !== "offer" && s.kind !== "answer") || typeof s.sdp !== "string") {
    throw new Error("Unrecognised pairing code.");
  }
  return s as Signal;
}

/** Header sent before the binary chunks so the receiver can reassemble. */
export interface TransferMeta {
  type: "meta";
  name: string;
  mime: string;
  size: number;
  chunks: number;
}

export const DEFAULT_CHUNK_SIZE = 16 * 1024; // 16 KiB — safe for RTCDataChannel

export function sliceIntoChunks(bytes: Uint8Array, chunkSize = DEFAULT_CHUNK_SIZE): Uint8Array[] {
  if (chunkSize <= 0) throw new Error("chunkSize must be positive");
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return chunks;
}

export function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export function makeMeta(name: string, mime: string, bytes: Uint8Array, chunkSize = DEFAULT_CHUNK_SIZE): TransferMeta {
  return {
    type: "meta",
    name,
    mime,
    size: bytes.length,
    chunks: Math.max(1, Math.ceil(bytes.length / chunkSize)),
  };
}

/** Base64 (no data: prefix) → bytes, for turning a scanned/received payload back into a file. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
