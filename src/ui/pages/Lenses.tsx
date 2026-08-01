import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { createLens, deleteLens, updateLens } from "../../data/repo";
import type { Lens } from "../../domain/types";
import { Field, Modal, Empty, useToast } from "../components";
import { useT } from "../../app/prefs";

type Draft = { make: string; model: string; focalLength: string; maxAperture: string; serial: string; notes: string };
const EMPTY: Draft = { make: "", model: "", focalLength: "", maxAperture: "", serial: "", notes: "" };

export function Lenses() {
  const lenses = useLiveQuery(() => db.lenses.orderBy("make").toArray(), []);
  const [editing, setEditing] = useState<Lens | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const toast = useToast();
  const t = useT();

  const open = (l?: Lens) => {
    setEditing(l ?? null);
    setDraft(l ? {
      make: l.make, model: l.model, focalLength: l.focalLength ?? "",
      maxAperture: l.maxAperture ?? "", serial: l.serial ?? "", notes: l.notes ?? "",
    } : EMPTY);
  };

  const save = async () => {
    if (!draft || !draft.model.trim()) return;
    if (editing) { await updateLens(editing.id, draft); toast(t("Lens updated")); }
    else { await createLens(draft); toast(t("Lens added")); }
    setDraft(null);
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Lenses")}</h1>
          <p className="sub">{t("Lenses you assign per frame. Focal length and lens model flow into the scan metadata.")}</p>
        </div>
        <button className="btn primary" onClick={() => open()}>{t("＋ Add lens")}</button>
      </div>

      {lenses && lenses.length === 0 && (
        <Empty icon="🔭" title={t("No lenses yet")}>{t("Add the lenses you shoot with to assign them per frame.")}</Empty>
      )}

      <div className="grid cols-2">
        {lenses?.map((l) => (
          <div className="card click" key={l.id} onClick={() => open(l)}>
            <h3>{l.make} {l.model}</h3>
            <div className="meta">
              {[l.focalLength && `${l.focalLength} mm`, l.maxAperture && `f/${l.maxAperture}`].filter(Boolean).join(" · ")}
            </div>
            {l.serial && <div className="meta mono">S/N {l.serial}</div>}
          </div>
        ))}
      </div>

      {draft && (
        <Modal title={editing ? t("Edit lens") : t("Add lens")} onClose={() => setDraft(null)}>
          <div className="field-row">
            <Field label={t("Make")}><input autoFocus value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} placeholder="Nikon" /></Field>
            <Field label={t("Model")}><input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="50mm f/1.8 AI-S" /></Field>
          </div>
          <div className="field-row">
            <Field label={t("Focal length (mm)")}><input value={draft.focalLength} onChange={(e) => setDraft({ ...draft, focalLength: e.target.value })} placeholder="50 or 24-70" /></Field>
            <Field label={t("Max aperture")}><input value={draft.maxAperture} onChange={(e) => setDraft({ ...draft, maxAperture: e.target.value })} placeholder="1.8" /></Field>
          </div>
          <Field label={t("Serial number (optional)")}><input value={draft.serial} onChange={(e) => setDraft({ ...draft, serial: e.target.value })} /></Field>
          <div className="modal-actions">
            {editing && <button className="btn danger" onClick={async () => { await deleteLens(editing.id); setDraft(null); toast(t("Lens deleted")); }}>{t("Delete")}</button>}
            <div className="spacer" />
            <button className="btn ghost" onClick={() => setDraft(null)}>{t("Cancel")}</button>
            <button className="btn primary" onClick={save} disabled={!draft.model.trim()}>{t("Save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
