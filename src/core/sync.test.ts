import { describe, expect, it } from "vitest";
import { mergeById, mergeLibraries, type Library } from "./sync";
import type { Camera } from "../domain/types";

const cam = (id: string, model: string, updatedAt: string): Camera => ({
  id, make: "Nikon", model, format: "135", createdAt: "2026-01-01T00:00:00.000Z", updatedAt,
});

describe("mergeById", () => {
  it("unions new records", () => {
    const out = mergeById([cam("a", "FM2", "2026-01-01T00:00:00Z")], [cam("b", "F3", "2026-01-01T00:00:00Z")]);
    expect(out.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });
  it("newer updatedAt wins", () => {
    const out = mergeById(
      [cam("a", "old", "2026-01-01T00:00:00Z")],
      [cam("a", "new", "2026-02-01T00:00:00Z")],
    );
    expect(out).toHaveLength(1);
    expect(out[0].model).toBe("new");
  });
  it("keeps local on an exact timestamp tie", () => {
    const t = "2026-03-01T00:00:00Z";
    const out = mergeById([cam("a", "local", t)], [cam("a", "incoming", t)]);
    expect(out[0].model).toBe("local");
  });
});

const empty: Library = { cameras: [], lenses: [], films: [], rolls: [], frames: [] };

describe("mergeLibraries", () => {
  it("reports how many incoming records won", () => {
    const local: Library = { ...empty, cameras: [cam("a", "old", "2026-01-01T00:00:00Z")] };
    const incoming: Library = {
      ...empty,
      cameras: [cam("a", "new", "2026-02-01T00:00:00Z"), cam("b", "F3", "2026-01-01T00:00:00Z")],
    };
    const { merged, changed } = mergeLibraries(local, incoming);
    expect(changed).toBe(2); // "a" updated + "b" added
    expect(merged.cameras).toHaveLength(2);
  });

  it("is idempotent: merging the same library twice changes nothing", () => {
    const lib: Library = { ...empty, cameras: [cam("a", "x", "2026-01-01T00:00:00Z")] };
    expect(mergeLibraries(lib, lib).changed).toBe(0);
  });
});
