import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { createRoll, ensureFramesForRoll } from "../../data/repo";
import { parseRollQr } from "../../core/booklet";
import type { Roll } from "../../domain/types";
import { Field, Modal, Empty, QrScanner, useToast } from "../components";
import { useT } from "../../app/prefs";

interface Draft {
  label: string;
  cameraId: string;
  filmStockId: string;
  frameCount: number;
  pushExposureIndex: string;
  dateLoaded: string;
}

export function Rolls() {
  const nav = useNavigate();
  const toast = useToast();
  const t = useT();
  const rolls = useLiveQuery(() => db.rolls.orderBy("updatedAt").reverse().toArray(), []);
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);
  const frameCounts = useLiveQuery(async () => {
    const all = await db.frames.toArray();
    const map: Record<string, { total: number; linked: number }> = {};
    for (const f of all) {
      const e = (map[f.rollId] ??= { total: 0, linked: 0 });
      e.total++;
      if (f.scanFileName) e.linked++;
    }
    return map;
  }, []);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [scanning, setScanning] = useState(false);

  const onScan = async (text: string) => {
    setScanning(false);
    const id = parseRollQr(text);
    if (!id) return toast(t("That's not a booklet code"));
    const roll = await db.rolls.get(id);
    if (!roll) return toast(t("That roll isn't on this device"));
    nav(`/rolls/${id}`);
  };

  const openNew = () =>
    setDraft({
      label: "",
      cameraId: cameras?.[0]?.id ?? "",
      filmStockId: films?.[0]?.id ?? "",
      frameCount: 36,
      pushExposureIndex: "",
      dateLoaded: new Date().toISOString().slice(0, 10),
    });

  const save = async () => {
    if (!draft || !draft.label.trim()) return;
    const roll = await createRoll({
      label: draft.label.trim(),
      cameraId: draft.cameraId || undefined,
      filmStockId: draft.filmStockId || undefined,
      frameCount: Math.max(1, draft.frameCount),
      pushExposureIndex: draft.pushExposureIndex ? Number(draft.pushExposureIndex) : undefined,
      dateLoaded: draft.dateLoaded ? new Date(draft.dateLoaded).toISOString() : undefined,
    });
    await ensureFramesForRoll(roll);
    setDraft(null);
    toast(t("Roll created"));
    nav(`/rolls/${roll.id}`);
  };

  const nameFor = (roll: Roll) => {
    const cam = cameras?.find((c) => c.id === roll.cameraId);
    const film = films?.find((f) => f.id === roll.filmStockId);
    return [film && `${film.brand} ${film.name}`, cam && `${cam.make} ${cam.model}`]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Film rolls")}</h1>
          <p className="sub">{t("Each roll pairs a camera with a film stock and holds one frame per exposure. Open a roll to log frames and assign your scans.")}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setScanning(true)}>{t("📷 Scan booklet")}</button>
          <button className="btn primary" onClick={openNew}>{t("＋ New roll")}</button>
        </div>
      </div>

      {scanning && <QrScanner onResult={onScan} onClose={() => setScanning(false)} />}

      {rolls && rolls.length === 0 && (
        <Empty icon="🎬" title={t("No rolls yet")}>{t("Create your first roll to start logging frames.")}</Empty>
      )}

      <div className="grid cols-2">
        {rolls?.map((r) => {
          const counts = frameCounts?.[r.id];
          return (
            <div className="card click" key={r.id} onClick={() => nav(`/rolls/${r.id}`)}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{r.label}</h3>
                <div className="spacer" />
                {counts && counts.linked === counts.total && counts.total > 0 ? (
                  <span className="badge ok">{t("complete")}</span>
                ) : counts && counts.linked > 0 ? (
                  <span className="badge warn">{t("{n} linked", { n: `${counts.linked}/${counts.total}` })}</span>
                ) : (
                  <span className="badge">{r.frameCount} {t("frames")}</span>
                )}
              </div>
              <div className="meta" style={{ marginTop: 4 }}>{nameFor(r) || t("No camera/film set")}</div>
              {r.pushExposureIndex && <div className="meta">{t("Pushed to EI {n}", { n: r.pushExposureIndex })}</div>}
            </div>
          );
        })}
      </div>

      {draft && (
        <Modal title={t("New roll")} onClose={() => setDraft(null)}>
          <Field label={t("Label / roll code")}>
            <input autoFocus value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Portra #14" />
          </Field>
          <div className="field-row">
            <Field label={t("Camera")}>
              <select value={draft.cameraId} onChange={(e) => setDraft({ ...draft, cameraId: e.target.value })}>
                <option value="">{t("— none —")}</option>
                {cameras?.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model}</option>)}
              </select>
            </Field>
            <Field label={t("Film stock")}>
              <select value={draft.filmStockId} onChange={(e) => setDraft({ ...draft, filmStockId: e.target.value })}>
                <option value="">{t("— none —")}</option>
                {films?.map((f) => <option key={f.id} value={f.id}>{f.brand} {f.name} ({f.iso})</option>)}
              </select>
            </Field>
          </div>
          <div className="field-row three">
            <Field label={t("Frames")}><input type="number" min={1} value={draft.frameCount} onChange={(e) => setDraft({ ...draft, frameCount: Number(e.target.value) })} /></Field>
            <Field label={t("Push/pull to EI")}><input value={draft.pushExposureIndex} onChange={(e) => setDraft({ ...draft, pushExposureIndex: e.target.value })} placeholder="box speed" /></Field>
            <Field label={t("Date loaded")}><input type="date" value={draft.dateLoaded} onChange={(e) => setDraft({ ...draft, dateLoaded: e.target.value })} /></Field>
          </div>
          {(cameras?.length === 0 || films?.length === 0) && (
            <p className="hint">{t("Tip: add cameras and film stocks first so you can attach them — you can still create the roll without them.")}</p>
          )}
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setDraft(null)}>{t("Cancel")}</button>
            <button className="btn primary" onClick={save} disabled={!draft.label.trim()}>{t("Create & log frames")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
