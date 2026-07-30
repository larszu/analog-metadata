import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { createCamera, deleteCamera, updateCamera } from "../../data/repo";
import { FILM_FORMATS } from "../../domain/constants";
import type { Camera, FilmFormat } from "../../domain/types";
import { Field, Modal, Empty, useToast } from "../components";

type Draft = { make: string; model: string; serial: string; format: FilmFormat; notes: string };
const EMPTY: Draft = { make: "", model: "", serial: "", format: "135", notes: "" };

export function Cameras() {
  const cameras = useLiveQuery(() => db.cameras.orderBy("make").toArray(), []);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const toast = useToast();

  const open = (c?: Camera) => {
    setEditing(c ?? null);
    setDraft(c ? { make: c.make, model: c.model, serial: c.serial ?? "", format: c.format, notes: c.notes ?? "" } : EMPTY);
  };

  const save = async () => {
    if (!draft || !draft.make.trim()) return;
    if (editing) {
      await updateCamera(editing.id, draft);
      toast("Camera updated");
    } else {
      await createCamera(draft);
      toast("Camera added");
    }
    setDraft(null);
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Cameras</h1>
          <p className="sub">Your camera bodies. Make and model become the EXIF/XMP camera fields on every frame you shoot with them.</p>
        </div>
        <button className="btn primary" onClick={() => open()}>＋ Add camera</button>
      </div>

      {cameras && cameras.length === 0 && (
        <Empty icon="📷" title="No cameras yet">Add your first analog body to start logging rolls.</Empty>
      )}

      <div className="grid cols-2">
        {cameras?.map((c) => (
          <div className="card click" key={c.id} onClick={() => open(c)}>
            <h3>{c.make} {c.model}</h3>
            <div className="meta">{FILM_FORMATS.find((f) => f.value === c.format)?.label}</div>
            {c.serial && <div className="meta mono">S/N {c.serial}</div>}
            {c.notes && <div className="meta" style={{ marginTop: 6 }}>{c.notes}</div>}
          </div>
        ))}
      </div>

      {draft && (
        <Modal title={editing ? "Edit camera" : "Add camera"} onClose={() => setDraft(null)}>
          <div className="field-row">
            <Field label="Make">
              <input autoFocus value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} placeholder="Nikon" />
            </Field>
            <Field label="Model">
              <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="FM2" />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Format">
              <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as FilmFormat })}>
                {FILM_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Serial number (optional)">
              <input value={draft.serial} onChange={(e) => setDraft({ ...draft, serial: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <div className="modal-actions">
            {editing && (
              <button className="btn danger" onClick={async () => { await deleteCamera(editing.id); setDraft(null); toast("Camera deleted"); }}>
                Delete
              </button>
            )}
            <div className="spacer" />
            <button className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={!draft.make.trim()}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
