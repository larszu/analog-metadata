import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { createFilm, deleteFilm, updateFilm } from "../../data/repo";
import {
  DEV_PROCESSES,
  FILM_FORMATS,
  FILM_STOCK_PRESETS,
  FILM_TYPES,
} from "../../domain/constants";
import type { DevelopmentProcess, FilmFormat, FilmStock, FilmType } from "../../domain/types";
import { Field, Modal, Empty, useToast } from "../components";

type Draft = {
  brand: string; name: string; iso: number; type: FilmType;
  format: FilmFormat; process: DevelopmentProcess; notes: string;
};
const EMPTY: Draft = { brand: "", name: "", iso: 400, type: "color-negative", format: "135", process: "C-41", notes: "" };

export function Films() {
  const films = useLiveQuery(() => db.films.orderBy("brand").toArray(), []);
  const [editing, setEditing] = useState<FilmStock | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const toast = useToast();

  const open = (f?: FilmStock) => {
    setEditing(f ?? null);
    setDraft(f ? { brand: f.brand, name: f.name, iso: f.iso, type: f.type, format: f.format, process: f.process, notes: f.notes ?? "" } : EMPTY);
  };

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    if (editing) { await updateFilm(editing.id, draft); toast("Film updated"); }
    else { await createFilm(draft); toast("Film added"); }
    setDraft(null);
  };

  const addPreset = async (p: (typeof FILM_STOCK_PRESETS)[number]) => {
    await createFilm({ ...p, format: "135" });
    toast(`Added ${p.brand} ${p.name}`);
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Film stocks</h1>
          <p className="sub">The films you shoot. ISO and stock name are recorded per roll and written to every frame's metadata and keywords.</p>
        </div>
        <button className="btn primary" onClick={() => open()}>＋ Add film</button>
      </div>

      {films && films.length === 0 && (
        <>
          <Empty icon="🎞" title="No film stocks yet">Add one manually, or pick from the popular presets below.</Empty>
          <h3 style={{ marginTop: 24 }}>Quick add presets</h3>
          <div className="chips">
            {FILM_STOCK_PRESETS.map((p) => (
              <button key={`${p.brand}${p.name}`} className="chip" onClick={() => addPreset(p)}>
                ＋ {p.brand} {p.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grid cols-2">
        {films?.map((f) => (
          <div className="card click" key={f.id} onClick={() => open(f)}>
            <h3>{f.brand} {f.name}</h3>
            <div className="meta">
              ISO {f.iso} · {FILM_TYPES.find((t) => t.value === f.type)?.label} · {f.process}
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <Modal title={editing ? "Edit film" : "Add film"} onClose={() => setDraft(null)}>
          <div className="field-row">
            <Field label="Brand"><input autoFocus value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} placeholder="Kodak" /></Field>
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Portra 400" /></Field>
          </div>
          <div className="field-row three">
            <Field label="ISO"><input type="number" value={draft.iso} onChange={(e) => setDraft({ ...draft, iso: Number(e.target.value) })} /></Field>
            <Field label="Type">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as FilmType })}>
                {FILM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Process">
              <select value={draft.process} onChange={(e) => setDraft({ ...draft, process: e.target.value as DevelopmentProcess })}>
                {DEV_PROCESSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Format">
            <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as FilmFormat })}>
              {FILM_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
          <div className="modal-actions">
            {editing && <button className="btn danger" onClick={async () => { await deleteFilm(editing.id); setDraft(null); toast("Film deleted"); }}>Delete</button>}
            <div className="spacer" />
            <button className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={!draft.name.trim()}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
