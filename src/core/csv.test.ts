import { describe, expect, it } from "vitest";
import { framesToCsv } from "./csv";
import type { ResolvedMetadata } from "./mapping";

const base: ResolvedMetadata = { frameNumber: 1, keywords: [], software: "test" };
const rowFor = (m: Partial<ResolvedMetadata>) =>
  framesToCsv([{ ...base, ...m }]).split("\n")[1];

describe("framesToCsv", () => {
  it("writes a header and one row per frame", () => {
    const csv = framesToCsv([base, { ...base, frameNumber: 2 }]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Scan file");
    expect(lines).toHaveLength(3);
  });

  it("quotes and escapes cells containing commas or quotes", () => {
    expect(rowFor({ title: 'a,b' })).toContain('"a,b"');
    expect(rowFor({ title: 'say "hi"' })).toContain('"say ""hi"""');
  });

  // --- CSV injection (CWE-1236) ---
  it("neutralises formula-leading cells so spreadsheets can't execute them", () => {
    for (const payload of ["=cmd|'/c calc'!A0", "+1+1", "@SUM(1+1)", "-2+3"]) {
      const row = rowFor({ title: payload });
      expect(row).not.toMatch(/(^|,)[=+@]/);
      expect(row).toContain("'" + payload.slice(0, 4));
    }
  });

  it("keeps plain negative numbers intact (e.g. a southern latitude)", () => {
    const row = rowFor({ gps: { lat: -33.86, lon: 151.2 } });
    expect(row).toContain("-33.86,151.2");
    expect(row).not.toContain("'-33.86");
  });
});
