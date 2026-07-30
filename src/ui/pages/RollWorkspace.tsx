import { useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "../../data/db";
import {
  createFrame,
  deleteFrame,
  deleteRoll,
  updateRoll,
} from "../../data/repo";
import type { Roll } from "../../domain/types";
import { resolveFrameMetadata } from "../../core/mapping";
import { buildExportZip, type ExportItem } from "../../core/export";
import { fileToDataUrl, makeThumbnail } from "../imageUtils";
import { Field, Modal, Empty, useToast } from "../components";
import { FrameEditor, type ScanEntry } from "./FrameEditor";

export function RollWorkspace() {
  const { id } = useParams();
  const toast = useToast();

  const roll = useLiveQuery(() => (id ? db.rolls.get(id) : undefined), [id]);
  const frames = useLiveQuery(
    () => (id ? db.frames.where("rollId").equals(id).sortBy("frameNumber") : []),
    [id],
  );
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const lenses = useLiveQuery(() => db.lenses.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const scanBytes = useRef<Map<string, string>>(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const scanInput = useRef<HTMLInputElement>(null);
  const logInput = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => frames?.find((f) => f.id === selectedId) ?? frames?.[0],
    [frames, selectedId],
  );
  const prevFrame = useMemo(() => {
    if (!frames || !selected) return undefined;
    return [...frames]
      .filter((f) => f.frameNumber < selected.frameNumber)
      .sort((a, b) => b.frameNumber - a.frameNumber)[0];
  }, [frames, selected]);

  if (roll === undefined || frames === undefined) return <p className="hint">Loading…</p>;
  if (roll === null) {
    return (
      <Empty icon="🤔" title="Roll not found">
        <Link to="/rolls">Back to rolls</Link>
      </Empty>
    );
  }

  // ---- scan import ----
  const importScans = async (files: FileList | null) => {
    if (!files) return;
    const added: ScanEntry[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      scanBytes.current.set(file.name, dataUrl);
      const thumbUrl = await makeThumbnail(dataUrl);
      added.push({ name: file.name, thumbUrl });
    }
    setScans((prev) => {
      const byName = new Map(prev.map((s) => [s.name, s]));
      added.forEach((s) => byName.set(s.name, s));
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    });
    toast(`${added.length} scan${added.length === 1 ? "" : "s"} imported`);
  };

  // ---- auto-assign scans to frames in order ----
  const autoAssign = async () => {
    if (scans.length === 0) return toast("Import scans first");
    const ordered = [...scans].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sortedFrames = [...frames].sort((a, b) => a.frameNumber - b.frameNumber);
    const n = Math.min(ordered.length, sortedFrames.length);
    for (let i = 0; i < n; i++) {
      await db.frames.update(sortedFrames[i].id, {
        scanFileName: ordered[i].name,
        scanThumbUrl: ordered[i].thumbUrl,
        updatedAt: new Date().toISOString(),
      });
    }
    toast(`Linked ${n} scans in order`);
  };

  // ---- capture / attach a photo of the handwritten log page ----
  const captureLogPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const dataUrl = await fileToDataUrl(files[0]);
    const readable = await makeThumbnail(dataUrl, 1400);
    const photo = { id: crypto.randomUUID(), dataUrl: readable, createdAt: new Date().toISOString() };
    await updateRoll(roll.id, { logPhotos: [...(roll.logPhotos ?? []), photo] });
    toast("Log page attached");
  };

  const removeLogPhoto = async (photoId: string) => {
    await updateRoll(roll.id, { logPhotos: (roll.logPhotos ?? []).filter((p) => p.id !== photoId) });
  };

  const addFrame = async () => {
    const max = frames.reduce((m, f) => Math.max(m, f.frameNumber), 0);
    await createFrame({ rollId: roll.id, frameNumber: max + 1, keywords: [], weather: [] });
  };

  // Fast logging: push the selected frame's exposure onto every frame that
  // hasn't got its own aperture/shutter/lens yet.
  const applyToEmpty = async () => {
    if (!selected) return;
    const patch = {
      lensId: selected.lensId,
      aperture: selected.aperture,
      shutterSpeed: selected.shutterSpeed,
      focalLength: selected.focalLength,
      updatedAt: new Date().toISOString(),
    };
    const targets = frames.filter((f) => f.id !== selected.id && !f.aperture && !f.shutterSpeed && !f.lensId);
    if (targets.length === 0) return toast("No empty frames to fill");
    await Promise.all(targets.map((f) => db.frames.update(f.id, patch)));
    toast(`Applied to ${targets.length} empty frame${targets.length === 1 ? "" : "s"}`);
  };

  // ---- export ----
  const doExport = async () => {
    setBusy(true);
    try {
      const settings = await getSettings();
      const camera = cameras?.find((c) => c.id === roll.cameraId);
      const film = films?.find((fi) => fi.id === roll.filmStockId);
      const linked = frames.filter((f) => f.scanFileName);
      if (linked.length === 0) {
        toast("Link at least one scan first");
        return;
      }
      const items: ExportItem[] = linked.map((frame) => {
        const lens = lenses?.find((l) => l.id === frame.lensId);
        const resolved = resolveFrameMetadata({ frame, roll, camera, lens, film, settings });
        return { resolved, scanDataUrl: scanBytes.current.get(frame.scanFileName!) };
      });
      const result = await buildExportZip(roll.label, items);
      downloadBlob(result.blob, `${slug(roll.label)}-metadata.zip`);
      toast(`Exported ${result.sidecarCount} sidecars, ${result.embeddedCount} embedded JPEGs`);
    } finally {
      setBusy(false);
    }
  };

  const linkedCount = frames.filter((f) => f.scanFileName).length;

  return (
    <div>
      <div className="content-head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/rolls" className="btn ghost sm">← Rolls</Link>
          </div>
          <h1 style={{ marginTop: 8 }}>{roll.label}</h1>
          <p className="sub">
            {describeRoll(roll, cameras ?? [], films ?? [])} · {linkedCount}/{frames.length} frames linked to scans
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setShowSettings(true)}>Roll settings</button>
          <button className="btn primary" onClick={doExport} disabled={busy}>⤓ Export metadata</button>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => scanInput.current?.click()}>＋ Import scans</button>
        <button className="btn" onClick={autoAssign}>⇄ Auto-assign in order</button>
        <button className="btn" onClick={() => logInput.current?.click()}>📷 Capture log page</button>
        <button className="btn" onClick={applyToEmpty} title="Copy this frame's lens, aperture & shutter to all frames that have none">⤵ Apply to empty frames</button>
        <button className="btn ghost" onClick={addFrame}>＋ Frame</button>
        <input ref={scanInput} type="file" accept="image/*" multiple hidden onChange={(e) => { importScans(e.target.files); e.target.value = ""; }} />
        <input ref={logInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { captureLogPhoto(e.target.files); e.target.value = ""; }} />
      </div>

      {scans.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Imported scans ({scans.length})</h3>
          <div className="chips">
            {scans.map((s) => {
              const linked = frames.some((f) => f.scanFileName === s.name);
              return (
                <span key={s.name} className={`chip${linked ? " on" : ""}`} title={s.name}>
                  {linked ? "✓ " : ""}{s.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="workspace">
        <div>
          {(roll.logPhotos ?? []).length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h3>Log page reference</h3>
              {(roll.logPhotos ?? []).map((p) => (
                <div key={p.id} style={{ marginBottom: 8 }}>
                  <img className="log-photo" src={p.dataUrl} alt="handwritten log page" />
                  <button className="btn ghost sm" onClick={() => removeLogPhoto(p.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3>Frames</h3>
            <div className="frame-strip">
              {frames.map((f) => (
                <div
                  key={f.id}
                  className={`frame-item${f.scanFileName ? " done" : ""}${selected?.id === f.id ? " active" : ""}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <div className="fno">{f.frameNumber}</div>
                  {f.scanThumbUrl && <img className="scan-thumb" src={f.scanThumbUrl} alt="" />}
                  <div className="ftitle">
                    {f.title || <small>untitled</small>}
                    <div><small>{[f.aperture && `f/${f.aperture}`, f.shutterSpeed].filter(Boolean).join(" · ")}</small></div>
                  </div>
                  <button
                    className="btn ghost sm"
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete frame ${f.frameNumber}?`)) deleteFrame(f.id); }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {selected ? (
            <FrameEditor key={selected.id} frame={selected} roll={roll} lenses={lenses ?? []} scans={scans} prevFrame={prevFrame} />
          ) : (
            <Empty icon="🎞️" title="No frames">Add a frame to begin.</Empty>
          )}
        </div>
      </div>

      {showSettings && (
        <RollSettings roll={roll} onClose={() => setShowSettings(false)} onDeleted={() => (window.location.hash = "#/rolls")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RollSettings({ roll, onClose, onDeleted }: { roll: Roll; onClose: () => void; onDeleted: () => void }) {
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);
  const toast = useToast();
  const [d, setD] = useState({
    label: roll.label,
    cameraId: roll.cameraId ?? "",
    filmStockId: roll.filmStockId ?? "",
    pushExposureIndex: roll.pushExposureIndex?.toString() ?? "",
    dateLoaded: roll.dateLoaded?.slice(0, 10) ?? "",
    dateFinished: roll.dateFinished?.slice(0, 10) ?? "",
    lab: roll.lab ?? "",
    developer: roll.developer ?? "",
    artist: roll.artist ?? "",
    copyright: roll.copyright ?? "",
    notes: roll.notes ?? "",
  });

  const save = async () => {
    await updateRoll(roll.id, {
      label: d.label.trim() || roll.label,
      cameraId: d.cameraId || undefined,
      filmStockId: d.filmStockId || undefined,
      pushExposureIndex: d.pushExposureIndex ? Number(d.pushExposureIndex) : undefined,
      dateLoaded: d.dateLoaded ? new Date(d.dateLoaded).toISOString() : undefined,
      dateFinished: d.dateFinished ? new Date(d.dateFinished).toISOString() : undefined,
      lab: d.lab || undefined,
      developer: d.developer || undefined,
      artist: d.artist || undefined,
      copyright: d.copyright || undefined,
      notes: d.notes || undefined,
    });
    toast("Roll updated");
    onClose();
  };

  return (
    <Modal title="Roll settings" onClose={onClose} wide>
      <Field label="Label"><input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} /></Field>
      <div className="field-row">
        <Field label="Camera">
          <select value={d.cameraId} onChange={(e) => setD({ ...d, cameraId: e.target.value })}>
            <option value="">— none —</option>
            {cameras?.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model}</option>)}
          </select>
        </Field>
        <Field label="Film stock">
          <select value={d.filmStockId} onChange={(e) => setD({ ...d, filmStockId: e.target.value })}>
            <option value="">— none —</option>
            {films?.map((f) => <option key={f.id} value={f.id}>{f.brand} {f.name} ({f.iso})</option>)}
          </select>
        </Field>
      </div>
      <div className="field-row three">
        <Field label="Push/pull to EI"><input value={d.pushExposureIndex} onChange={(e) => setD({ ...d, pushExposureIndex: e.target.value })} placeholder="box speed" /></Field>
        <Field label="Date loaded"><input type="date" value={d.dateLoaded} onChange={(e) => setD({ ...d, dateLoaded: e.target.value })} /></Field>
        <Field label="Date finished"><input type="date" value={d.dateFinished} onChange={(e) => setD({ ...d, dateFinished: e.target.value })} /></Field>
      </div>
      <div className="field-row">
        <Field label="Lab"><input value={d.lab} onChange={(e) => setD({ ...d, lab: e.target.value })} /></Field>
        <Field label="Developer"><input value={d.developer} onChange={(e) => setD({ ...d, developer: e.target.value })} /></Field>
      </div>
      <div className="field-row">
        <Field label="Artist / creator"><input value={d.artist} onChange={(e) => setD({ ...d, artist: e.target.value })} /></Field>
        <Field label="Copyright"><input value={d.copyright} onChange={(e) => setD({ ...d, copyright: e.target.value })} /></Field>
      </div>
      <Field label="Notes"><textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
      <div className="modal-actions">
        <button className="btn danger" onClick={async () => { if (confirm("Delete this roll and all its frames?")) { await deleteRoll(roll.id); onDeleted(); } }}>Delete roll</button>
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function describeRoll(roll: Roll, cameras: { id: string; make: string; model: string }[], films: { id: string; brand: string; name: string }[]) {
  const cam = cameras.find((c) => c.id === roll.cameraId);
  const film = films.find((f) => f.id === roll.filmStockId);
  return [film && `${film.brand} ${film.name}`, cam && `${cam.make} ${cam.model}`].filter(Boolean).join(" · ") || "No camera/film set";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "roll";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
