import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { buildBookletPdf, type BookletOptions } from "../../core/booklet";
import { Field, useToast } from "../components";

export function PrintBooklet() {
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);
  const toast = useToast();

  const [opts, setOpts] = useState<BookletOptions>({
    layout: "a6",
    framesPerSheet: 12,
    sheets: 3,
    title: "Film log",
  });
  const [cameraId, setCameraId] = useState("");
  const [filmId, setFilmId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const build = async (): Promise<Uint8Array> => {
    const cam = cameras?.find((c) => c.id === cameraId);
    const film = films?.find((f) => f.id === filmId);
    return buildBookletPdf({
      ...opts,
      camera: cam ? `${cam.make} ${cam.model}` : "",
      film: film ? `${film.brand} ${film.name}` : "",
      iso: film ? String(film.iso) : "",
    });
  };

  const toBlob = (bytes: Uint8Array) =>
    new Blob([bytes.slice().buffer], { type: "application/pdf" });

  const preview = async () => {
    const bytes = await build();
    const url = URL.createObjectURL(toBlob(bytes));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
  };

  const download = async () => {
    const bytes = await build();
    const url = URL.createObjectURL(toBlob(bytes));
    const a = document.createElement("a");
    a.href = url;
    a.download = `analog-log-${opts.layout}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Booklet PDF downloaded");
  };

  const printNow = async () => {
    const bytes = await build();
    const url = URL.createObjectURL(toBlob(bytes));
    const w = window.open(url);
    w?.addEventListener("load", () => w.print());
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Print booklet</h1>
          <p className="sub">
            Generate blank DIN A6 log sheets to carry with your camera. Pre-fill the header
            with a camera and film, choose how many sheets, then print or save the PDF.
          </p>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <Field label="Sheet title">
            <input value={opts.title ?? ""} onChange={(e) => setOpts({ ...opts, title: e.target.value })} />
          </Field>
          <Field label="Layout">
            <select value={opts.layout} onChange={(e) => setOpts({ ...opts, layout: e.target.value as BookletOptions["layout"] })}>
              <option value="a6">A6 pages (one per sheet)</option>
              <option value="a4-2up">A4 with 2×A6 (fold to booklet)</option>
            </select>
          </Field>
          <div className="field-row">
            <Field label="Frames per sheet">
              <input type="number" min={4} max={24} value={opts.framesPerSheet}
                onChange={(e) => setOpts({ ...opts, framesPerSheet: Number(e.target.value) })} />
            </Field>
            <Field label="Sheets">
              <input type="number" min={1} max={40} value={opts.sheets}
                onChange={(e) => setOpts({ ...opts, sheets: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Pre-fill camera (optional)">
            <select value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
              <option value="">— blank —</option>
              {cameras?.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model}</option>)}
            </select>
          </Field>
          <Field label="Pre-fill film (optional)">
            <select value={filmId} onChange={(e) => setFilmId(e.target.value)}>
              <option value="">— blank —</option>
              {films?.map((f) => <option key={f.id} value={f.id}>{f.brand} {f.name} ({f.iso})</option>)}
            </select>
          </Field>

          <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={preview}>Preview</button>
            <button className="btn" onClick={download}>⤓ Download PDF</button>
            <button className="btn primary" onClick={printNow}>🖨️ Print</button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            Printing A6 pages at home? In the print dialog choose “Actual size”. To fit four A6 sheets on
            one A4, pick “4 pages per sheet”.
          </p>
        </div>

        <div className="card" style={{ minHeight: 480, padding: previewUrl ? 0 : 16 }}>
          {previewUrl ? (
            <iframe title="Booklet preview" src={previewUrl} style={{ width: "100%", height: 620, border: "none", borderRadius: 10 }} />
          ) : (
            <div className="empty" style={{ border: "none" }}>
              <div className="big">🖨️</div>
              <p className="hint">Press <b>Preview</b> to see your log sheets here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
