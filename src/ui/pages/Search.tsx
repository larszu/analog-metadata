import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { searchAll, type HitType, type SearchHit } from "../../core/search";
import { Empty } from "../components";

const ICON: Record<HitType, string> = { roll: "🎬", frame: "🎞️", camera: "📷", lens: "🔭", film: "🎞" };

export function Search() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const idx = useLiveQuery(async () => {
    const [cameras, lenses, films, rolls, frames] = await Promise.all([
      db.cameras.toArray(), db.lenses.toArray(), db.films.toArray(), db.rolls.toArray(), db.frames.toArray(),
    ]);
    return { cameras, lenses, films, rolls, frames };
  }, []);

  const hits = useMemo(
    () => (idx ? searchAll(q, idx) : []),
    [q, idx],
  );

  const go = (hit: SearchHit) => {
    if (hit.type === "roll" || hit.type === "frame") nav(`/rolls/${hit.rollId}`);
    else if (hit.type === "camera") nav("/cameras");
    else if (hit.type === "lens") nav("/lenses");
    else if (hit.type === "film") nav("/films");
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Search</h1>
          <p className="sub">Find any roll, frame, camera, lens or film by subject, keyword, location, film stock and more.</p>
        </div>
      </div>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search everything…  e.g. “Portra”, “Hamburg”, “50mm”, “portrait”"
        style={{ fontSize: "1rem", padding: "12px 14px", marginBottom: 18 }}
      />

      {q.trim() === "" ? (
        <Empty icon="🔍" title="Start typing to search">Results appear as you type.</Empty>
      ) : hits.length === 0 ? (
        <Empty icon="🤷" title={`No matches for “${q}”`} />
      ) : (
        <>
          <p className="hint" style={{ marginBottom: 10 }}>{hits.length} result{hits.length === 1 ? "" : "s"}</p>
          <div className="grid cols-2">
            {hits.map((h) => (
              <div className="card click" key={`${h.type}-${h.id}`} onClick={() => go(h)}>
                <div className="row">
                  <span style={{ fontSize: "1.2rem" }}>{ICON[h.type]}</span>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0 }}>{h.title}</h3>
                    <div className="meta">{h.subtitle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
