import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { computeStats, type Tally } from "../../core/stats";
import { Empty } from "../components";

function BarList({ title, items, empty }: { title: string; items: Tally[]; empty: string }) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return (
    <div className="card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.slice(0, 6).map((i) => (
            <div key={i.label}>
              <div className="row" style={{ justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>{i.label}</span>
                <span className="hint">{i.count}</span>
              </div>
              <div style={{ height: 6, background: "var(--bg-elev-2)", borderRadius: 4, marginTop: 3 }}>
                <div style={{ width: `${(i.count / max) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stats() {
  const data = useLiveQuery(async () => {
    const [cameras, lenses, films, rolls, frames] = await Promise.all([
      db.cameras.toArray(), db.lenses.toArray(), db.films.toArray(), db.rolls.toArray(), db.frames.toArray(),
    ]);
    return computeStats({ cameras, lenses, films, rolls, frames });
  }, []);

  if (!data) return <p className="hint">Loading…</p>;

  const loggedPct = data.frames ? Math.round((data.framesLogged / data.frames) * 100) : 0;
  const linkedPct = data.frames ? Math.round((data.framesLinked / data.frames) * 100) : 0;

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Insights</h1>
          <p className="sub">Your shooting habits across every roll you've logged.</p>
        </div>
      </div>

      {data.rolls === 0 ? (
        <Empty icon="📊" title="No data yet">Log a roll and your stats will appear here.</Empty>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div><div className="n">{data.rolls}</div><div className="l">Rolls</div></div>
              <div><div className="n">{data.frames}</div><div className="l">Frames</div></div>
              <div><div className="n">{loggedPct}%</div><div className="l">Frames logged</div></div>
              <div><div className="n">{linkedPct}%</div><div className="l">Scans linked</div></div>
              <div><div className="n">{data.cameras}</div><div className="l">Cameras</div></div>
              <div><div className="n">{data.films}</div><div className="l">Film stocks</div></div>
            </div>
          </div>

          <div className="grid cols-2">
            <BarList title="Most-shot films" items={data.topFilms} empty="No film assigned to rolls yet." />
            <BarList title="Most-used cameras" items={data.topCameras} empty="No camera assigned to rolls yet." />
            <BarList title="Favourite apertures" items={data.topApertures} empty="No apertures logged yet." />
            <BarList title="Most-used lenses" items={data.topLenses} empty="No lenses assigned to frames yet." />
          </div>
        </>
      )}
    </div>
  );
}
