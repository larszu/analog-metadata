import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { createCamera, createFilm, createLens } from "../../data/repo";
import { buildBookletPdf, rollQrPayload, type BookletOptions, type PageSize } from "../../core/booklet";
import { Field, useToast } from "../components";
import { useT } from "../../app/prefs";

const PAGE_SIZE_OPTS: PageSize[] = ["A6", "A5", "A4", "Letter"];
const norm = (s: string) => s.trim().toLowerCase();
/** "Nikon FM2" -> { make: "Nikon", model: "FM2" }; single word -> make only. */
function splitGear(text: string): { first: string; rest: string } {
  const t = text.trim();
  const i = t.indexOf(" ");
  return i < 0 ? { first: t, rest: "" } : { first: t.slice(0, i), rest: t.slice(i + 1) };
}

export function PrintBooklet() {
  const cameras = useLiveQuery(() => db.cameras.toArray(), []);
  const films = useLiveQuery(() => db.films.toArray(), []);
  const lenses = useLiveQuery(() => db.lenses.toArray(), []);
  const rolls = useLiveQuery(() => db.rolls.orderBy("updatedAt").reverse().toArray(), []);
  const toast = useToast();
  const t = useT();
  const [params] = useSearchParams();

  const [opts, setOpts] = useState<BookletOptions>({
    layout: "single",
    pageSize: "A6",
    framesPerSheet: 12,
    sheets: 3,
    title: "Film log",
  });
  const [rollId, setRollId] = useState("");
  const [camera, setCamera] = useState("");
  const [film, setFilm] = useState("");
  const [lens, setLens] = useState("");
  const [iso, setIso] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const linkedRoll = rolls?.find((r) => r.id === rollId);

  // Deep-linked from a roll ("Print log sheets") — prefill from its gear.
  useEffect(() => {
    const r = params.get("roll");
    if (r) setRollId(r);
  }, [params]);

  useEffect(() => {
    if (!linkedRoll || !cameras || !films) return;
    const cam = cameras.find((c) => c.id === linkedRoll.cameraId);
    const fs = films.find((f) => f.id === linkedRoll.filmStockId);
    if (cam) setCamera(`${cam.make} ${cam.model}`.trim());
    if (fs) {
      setFilm(`${fs.brand} ${fs.name}`.trim());
      setIso(String(linkedRoll.pushExposureIndex ?? fs.iso));
    }
    setOpts((o) => ({ ...o, title: linkedRoll.label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId, cameras, films]);

  // --- recognition: does the typed gear already exist? ---
  const cameraKnown = !!camera && !!cameras?.some((c) => norm(`${c.make} ${c.model}`) === norm(camera));
  const filmKnown = !!film && !!films?.some((f) => norm(`${f.brand} ${f.name}`) === norm(film));
  const lensKnown = !!lens && !!lenses?.some((l) => norm(`${l.make} ${l.model}`) === norm(lens));

  const addCamera = async () => {
    const { first, rest } = splitGear(camera);
    await createCamera({ make: first, model: rest, format: "135" });
    toast(t("Added {name} to your library", { name: camera }));
  };
  const addFilm = async () => {
    const { first, rest } = splitGear(film);
    const isoN = Number(iso);
    await createFilm({ brand: first, name: rest, iso: Number.isFinite(isoN) && isoN > 0 ? isoN : 400, type: "color-negative", format: "135", process: "C-41" });
    toast(t("Added {name} to your library", { name: film }));
  };
  const addLens = async () => {
    const { first, rest } = splitGear(lens);
    await createLens({ make: first, model: rest });
    toast(t("Added {name} to your library", { name: lens }));
  };

  const build = (): Promise<Uint8Array> =>
    buildBookletPdf({
      ...opts,
      camera,
      film,
      lens,
      iso,
      qrData: linkedRoll ? rollQrPayload(linkedRoll.id) : undefined,
    });

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
    a.download = `analog-log-${opts.layout === "a4-2up" ? "a4-2up" : opts.pageSize}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t("Booklet PDF downloaded"));
  };
  const printNow = async () => {
    const w = window.open(URL.createObjectURL(toBlob(await build())));
    w?.addEventListener("load", () => w.print());
  };

  // A reusable manual gear input with datalist + recognition status.
  const gearField = (
    label: string, value: string, set: (v: string) => void, listId: string,
    options: string[], known: boolean, onAdd: () => void, placeholder: string,
  ) => (
    <Field label={label}>
      <input list={listId} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
      <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      {value.trim() && (
        known
          ? <span className="hint" style={{ color: "var(--ok)" }}>✓ {t("in your library")}</span>
          : <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>＋ {t("Add to library")}</button>
      )}
    </Field>
  );

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Print booklet")}</h1>
          <p className="sub">
            {t("Generate blank log sheets to carry with your camera. Choose a paper size, type or pick the camera, film and lens, then print or save the PDF.")}
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
            <input value={opts.title ?? ""} onChange={(e) => setOpts({ ...opts, title: e.target.value })} />
          </Field>

          <div className="field-row">
            <Field label={t("Layout")}>
              <select value={opts.layout} onChange={(e) => setOpts({ ...opts, layout: e.target.value as BookletOptions["layout"] })}>
                <option value="single">{t("One sheet per page")}</option>
                <option value="a4-2up">{t("A4 with 2×A6 (fold to booklet)")}</option>
              </select>
            </Field>
            <Field label={t("Paper size")}>
              <select value={opts.pageSize} disabled={opts.layout === "a4-2up"}
                onChange={(e) => setOpts({ ...opts, pageSize: e.target.value as PageSize })}>
                {PAGE_SIZE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="field-row">
            <Field label={t("Frames per sheet")}>
              <input type="number" min={4} max={40} value={opts.framesPerSheet}
                onChange={(e) => setOpts({ ...opts, framesPerSheet: Number(e.target.value) })} />
            </Field>
            <Field label={t("Sheets")}>
              <input type="number" min={1} max={40} value={opts.sheets}
                onChange={(e) => setOpts({ ...opts, sheets: Number(e.target.value) })} />
            </Field>
          </div>

          <p className="hint" style={{ marginTop: 0 }}>{t("Type or pick your gear — new entries can be saved to your library.")}</p>
          {gearField(t("Camera"), camera, setCamera, "dl-cam", (cameras ?? []).map((c) => `${c.make} ${c.model}`), cameraKnown, addCamera, "Nikon FM2")}
          {gearField(t("Film"), film, setFilm, "dl-film", (films ?? []).map((f) => `${f.brand} ${f.name}`), filmKnown, addFilm, "Kodak Portra 400")}
          {gearField(t("Lens"), lens, setLens, "dl-lens", (lenses ?? []).map((l) => `${l.make} ${l.model}`), lensKnown, addLens, "50mm f/1.8")}
          <Field label="ISO">
            <input value={iso} onChange={(e) => setIso(e.target.value)} placeholder="400" />
          </Field>

          {linkedRoll && (
            <p className="hint">
              {t("Each sheet gets a QR for “{roll}”. Photograph it back in via Film rolls ▸ Scan booklet to jump straight to this roll.", { roll: linkedRoll.label })}
            </p>
          )}

          <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={preview}>{t("Preview")}</button>
            <button className="btn" onClick={download}>{t("⤓ Download PDF")}</button>
            <button className="btn primary" onClick={printNow}>{t("🖨️ Print")}</button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            {t("When printing, choose “Actual size” in the print dialog so the sheet keeps its real dimensions.")}
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
