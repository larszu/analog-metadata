/** Cross-library text search over rolls, frames and gear. */
import type { Camera, FilmStock, Frame, Lens, Roll } from "../domain/types";

export type HitType = "roll" | "frame" | "camera" | "lens" | "film";

export interface SearchHit {
  type: HitType;
  id: string;
  title: string;
  subtitle: string;
  /** For frames: the roll to open. */
  rollId?: string;
}

export interface SearchIndex {
  cameras: Camera[];
  lenses: Lens[];
  films: FilmStock[];
  rolls: Roll[];
  frames: Frame[];
}

function has(haystack: (string | undefined)[], needle: string): boolean {
  const q = needle.toLowerCase();
  return haystack.some((h) => h && h.toLowerCase().includes(q));
}

export function searchAll(query: string, idx: SearchIndex): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const c of idx.cameras) {
    if (has([c.make, c.model, c.serial, c.notes], q)) {
      hits.push({ type: "camera", id: c.id, title: `${c.make} ${c.model}`, subtitle: "Camera" });
    }
  }
  for (const l of idx.lenses) {
    if (has([l.make, l.model, l.focalLength, l.serial, l.notes], q)) {
      hits.push({ type: "lens", id: l.id, title: `${l.make} ${l.model}`, subtitle: "Lens" });
    }
  }
  for (const f of idx.films) {
    if (has([f.brand, f.name, f.notes], q)) {
      hits.push({ type: "film", id: f.id, title: `${f.brand} ${f.name}`, subtitle: `Film · ISO ${f.iso}` });
    }
  }
  for (const r of idx.rolls) {
    if (has([r.label, r.lab, r.developer, r.artist, r.notes], q)) {
      hits.push({ type: "roll", id: r.id, title: r.label, subtitle: "Roll", rollId: r.id });
    }
  }
  for (const fr of idx.frames) {
    const fields = [fr.title, fr.description, fr.location, fr.notes, fr.aperture, fr.shutterSpeed, ...(fr.keywords ?? [])];
    if (has(fields, q)) {
      const roll = idx.rolls.find((r) => r.id === fr.rollId);
      hits.push({
        type: "frame",
        id: fr.id,
        title: fr.title || `Frame ${fr.frameNumber}`,
        subtitle: `Frame ${fr.frameNumber}${roll ? ` · ${roll.label}` : ""}`,
        rollId: fr.rollId,
      });
    }
  }
  return hits;
}
