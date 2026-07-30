import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";

export function Dashboard() {
  const nav = useNavigate();
  const rolls = useLiveQuery(() => db.rolls.orderBy("updatedAt").reverse().toArray(), []);
  const cameraCount = useLiveQuery(() => db.cameras.count(), []);
  const filmCount = useLiveQuery(() => db.films.count(), []);
  const frameStats = useLiveQuery(async () => {
    const frames = await db.frames.toArray();
    return { total: frames.length, linked: frames.filter((f) => f.scanFileName).length };
  }, []);

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">
            Turn your handwritten film log into clean digital metadata: record cameras, lenses and film
            stocks, log every frame of a roll, assign your scans, then export XMP/EXIF for Lightroom,
            Capture One, Explorer or Finder.
          </p>
        </div>
        <button className="btn primary" onClick={() => nav("/rolls")}>Open film rolls</button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div><div className="n">{rolls?.length ?? 0}</div><div className="l">Rolls</div></div>
          <div><div className="n">{frameStats?.total ?? 0}</div><div className="l">Frames logged</div></div>
          <div><div className="n">{frameStats?.linked ?? 0}</div><div className="l">Scans linked</div></div>
          <div><div className="n">{cameraCount ?? 0}</div><div className="l">Cameras</div></div>
          <div><div className="n">{filmCount ?? 0}</div><div className="l">Film stocks</div></div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Link to="/rolls" className="card click"><h3>🎬 Log a roll</h3><div className="meta">Create a roll and fill in each frame from your notes.</div></Link>
        <Link to="/print" className="card click"><h3>🖨️ Print a booklet</h3><div className="meta">Make blank DIN A6 log sheets to shoot with.</div></Link>
        <Link to="/cameras" className="card click"><h3>📷 Set up gear</h3><div className="meta">Add your cameras, lenses and film stocks.</div></Link>
      </div>

      <h2>Recent rolls</h2>
      {rolls && rolls.length > 0 ? (
        <div className="grid cols-2">
          {rolls.slice(0, 6).map((r) => (
            <Link to={`/rolls/${r.id}`} key={r.id} className="card click">
              <h3>{r.label}</h3>
              <div className="meta">{r.frameCount} frames</div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="hint">No rolls yet — <Link to="/rolls">create your first roll</Link>.</p>
      )}
    </div>
  );
}
