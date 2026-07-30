import { describe, expect, it } from "vitest";
import { makeBackup, readBackup, backupSummary, BACKUP_VERSION } from "./backup";
import type { Camera } from "../domain/types";

const now = "2026-07-30T10:00:00.000Z";
const camera: Camera = { id: "c1", make: "Nikon", model: "FM2", format: "135", createdAt: now, updatedAt: now };

describe("backup round-trip", () => {
  it("serialises and reads back the same data", () => {
    const json = makeBackup({ cameras: [camera], lenses: [], films: [], rolls: [], frames: [] });
    const back = readBackup(json);
    expect(back.app).toBe("analog-metadata");
    expect(back.version).toBe(BACKUP_VERSION);
    expect(back.cameras[0].model).toBe("FM2");
    expect(back.exportedAt).toBeTruthy();
  });

  it("summarises counts", () => {
    const b = readBackup(makeBackup({ cameras: [camera], lenses: [], films: [], rolls: [], frames: [] }));
    expect(backupSummary(b)).toContain("1 cameras");
  });
});

describe("readBackup validation", () => {
  it("rejects non-JSON", () => {
    expect(() => readBackup("not json")).toThrow(/valid JSON/);
  });
  it("rejects foreign files", () => {
    expect(() => readBackup(JSON.stringify({ app: "something-else" }))).toThrow(/Analog Metadata backup/);
  });
  it("rejects a newer version", () => {
    expect(() => readBackup(JSON.stringify({ app: "analog-metadata", version: 999, cameras: [], lenses: [], films: [], rolls: [], frames: [] }))).toThrow(/Unsupported/);
  });
  it("rejects a missing list", () => {
    expect(() => readBackup(JSON.stringify({ app: "analog-metadata", version: 1, cameras: [] }))).toThrow(/missing its "lenses"/);
  });
});
