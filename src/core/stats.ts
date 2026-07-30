/** Aggregate shooting insights from the library. */
import type { Camera, FilmStock, Frame, Lens, Roll } from "../domain/types";

export interface Tally {
  label: string;
  count: number;
}

export interface Stats {
  rolls: number;
  frames: number;
  framesLinked: number;
  framesLogged: number; // frames with any exposure info
  cameras: number;
  lenses: number;
  films: number;
  topFilms: Tally[];
  topCameras: Tally[];
  topLenses: Tally[];
  topApertures: Tally[];
}

function tally(pairs: (string | undefined)[]): Tally[] {
  const map = new Map<string, number>();
  for (const p of pairs) {
    if (!p) continue;
    map.set(p, (map.get(p) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface StatsInput {
  cameras: Camera[];
  lenses: Lens[];
  films: FilmStock[];
  rolls: Roll[];
  frames: Frame[];
}

export function computeStats({ cameras, lenses, films, rolls, frames }: StatsInput): Stats {
  const cameraName = (id?: string) => {
    const c = cameras.find((x) => x.id === id);
    return c ? `${c.make} ${c.model}` : undefined;
  };
  const filmName = (id?: string) => {
    const f = films.find((x) => x.id === id);
    return f ? `${f.brand} ${f.name}` : undefined;
  };
  const lensName = (id?: string) => {
    const l = lenses.find((x) => x.id === id);
    return l ? `${l.make} ${l.model}` : undefined;
  };

  return {
    rolls: rolls.length,
    frames: frames.length,
    framesLinked: frames.filter((f) => f.scanFileName).length,
    framesLogged: frames.filter((f) => f.aperture || f.shutterSpeed || f.title).length,
    cameras: cameras.length,
    lenses: lenses.length,
    films: films.length,
    // Films & cameras counted per roll (that's how they're used).
    topFilms: tally(rolls.map((r) => filmName(r.filmStockId))),
    topCameras: tally(rolls.map((r) => cameraName(r.cameraId))),
    // Lenses & apertures counted per frame.
    topLenses: tally(frames.map((f) => lensName(f.lensId))),
    topApertures: tally(frames.map((f) => (f.aperture ? `f/${f.aperture}` : undefined))),
  };
}
