import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { buildBookletPdf, rollQrPayload, type BookletOptions } from "../../core/booklet";
import { Field, useToast } from "../components";
import { useT } from "../../app/prefs";

export function PrintBooklet() {
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);
  const rolls = useLiveQuery(() => db.rolls.orderBy("updatedAt").reverse().toArray(), []);
  const toast = useToast();
  const t = useT();
  const [params] = useSearchParams();

  const [opts, setOpts] = useState<BookletOptions>({
    layout: "a6",
    framesPerSheet: 12,
    sheets: 3,
    title: "Film log",
  });
  const [rollId, setRollId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [filmId, setFilmId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Deep-linked from a roll (e.g. "Print log sheets" in the workspace).
  useEffect(() => {
    const r = params.get("roll");
    if (r) setRollId(r);
  }, [params]);

  const linkedRoll = rolls?.find((r) => r.id === rollId);

  const build = async (): Promise<Uint8Array> => {
    // A linked roll drives the header + the back-link QR; otherwise the manual pickers do.
    const effCameraId = linkedRoll?.cameraId ?? cameraId;
    const effFilmId = linkedRoll?.filmStockId ?? filmId;
    const cam = cameras?.find((c) => c.id === effCameraId);
    const film = films?.find((f) => f.id === effFilmId);
    return buildBookletPdf({
      ...opts,
      title: linkedRoll ? linkedRoll.label : opts.title,
      camera: cam ? `${cam.make} ${cam.model}` : "",
      film: film ? `${film.brand} ${film.name}` : "",
      iso: film ? String(film.iso) : "",
      qrData: linkedRoll ? rollQrPayload(linkedRoll.id) : undefined,
    });
  };

  const toBlob = (bytes: Uint8Array) => new Blob([bytes.slice().buffer], { type: "application/pdf" });

  const preview = async () => {
    const url = URL.createObjectURL(toBlob(await build()));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
  };

  const download = async () => {
    const url = URL.createObjectURL(toBlob(await build()));
    const a = document.createElement("a");
    a.href = url;
    a.download = `analog-log-${opts.layout}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t("Booklet PDF downloaded"));
  };

  const printNow = async () => {
    const url = URL.createObjectURL(toBlob(await build()));
    const w = window.open(url);
    w?.addEventListener("load", () => w.print());
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Print booklet")}</h1>
          <p className="sub">
            {t("Generate blank DIN A6 log sheets to carry with your camera. Pre-fill the header with a camera and film, choose how many sheets, then print or save the PDF.")}
          </p>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <Field label={t("Link to roll (adds a scannable back-link QR)")}>
            <select value={rollId} onChange={(e) => setRollId(e.target.value)}>
              <option value="">{t("— none (blank sheets) —")}</option>
              {rolls?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>

          <Field label={t("Sheet title")}>
            <input value={linkedRoll ? linkedRoll.label : opts.title ?? ""} disabled={!!linkedRoll}
              onChange={(e) => setOpts({ ...opts, title: e.target.value })} />
          </Field>
          <Field label={t("Layout")}>
            <select value={opts.layout} onChange={(e) => setOpts({ ...opts, layout: e.target.value as BookletOptions["layout"] })}>
              <option value="a6">{t("A6 pages (one per sheet)")}</option>
              <option value="a4-2up">{t("A4 with 2×A6 (fold to booklet)")}</option>
            </select>
          </Field>
          <div className="field-row">
            <Field label={t("Frames per sheet")}>
              <input type="number" min={4} max={24} value={opts.framesPerSheet}
                onChange={(e) => setOpts({ ...opts, framesPerSheet: Number(e.target.value) })} />
            </Field>
            <Field label={t("Sheets")}>
              <input type="number" min={1} max={40} value={opts.sheets}
                onChange={(e) => setOpts({ ...opts, sheets: Number(e.target.value) })} />
            </Field>
          </div>

          {!linkedRoll && (
            <>
              <Field label={t("Pre-fill camera (optional)")}>
                <select value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
                  <option value="">{t("— blank —")}</option>
                  {cameras?.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model}</option>)}
                </select>
              </Field>
              <Field label={t("Pre-fill film (optional)")}>
                <select value={filmId} onChange={(e) => setFilmId(e.target.value)}>
                  <option value="">{t("— blank —")}</option>
                  {films?.map((f) => <option key={f.id} value={f.id}>{f.brand} {f.name} ({f.iso})</option>)}
                </select>
              </Field>
            </>
          )}

          {linkedRoll && (
            <p className="hint" style={{ marginTop: 0 }}>
              {t("Each sheet gets a QR for “{roll}”. Photograph it back in via Film rolls ▸ Scan booklet to jump straight to this roll.", { roll: linkedRoll.label })}
            </p>
          )}

          <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={preview}>{t("Preview")}</button>
            <button className="btn" onClick={download}>{t("⤓ Download PDF")}</button>
            <button className="btn primary" onClick={printNow}>{t("🖨️ Print")}</button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            {t("Printing A6 pages at home? In the print dialog choose “Actual size”. To fit four A6 sheets on one A4, pick “4 pages per sheet”.")}
          </p>
        </div>

        <div className="card" style={{ minHeight: 480, padding: previewUrl ? 0 : 16 }}>
          {previewUrl ? (
            <iframe title="Booklet preview" src={previewUrl} style={{ width: "100%", height: 620, border: "none", borderRadius: 10 }} />
          ) : (
            <div className="empty" style={{ border: "none" }}>
              <div className="big">🖨️</div>
              <p className="hint">{t("Press Preview to see your log sheets here.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
