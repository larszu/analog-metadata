import { useState } from "react";
import { updateFrame } from "../../data/repo";
import { geocodePlace, lookupHistoricalWeather } from "../../data/geo";
import type { Frame, Lens, Roll, Weather } from "../../domain/types";
import { APERTURE_SCALE, SHUTTER_SPEEDS, WEATHER_OPTIONS } from "../../domain/constants";
import { Field, ChipGroup, ChipPick, useToast } from "../components";
import { useT } from "../../app/prefs";

export interface ScanEntry {
  name: string;
  thumbUrl: string;
}

/**
 * Editor for a single frame. Keyed by frame id at the call-site so it remounts
 * (and re-seeds its local state) whenever a different frame is selected.
 */
export function FrameEditor({
  frame,
  roll,
  lenses,
  scans,
  prevFrame,
}: {
  frame: Frame;
  roll: Roll;
  lenses: Lens[];
  scans: ScanEntry[];
  prevFrame?: Frame;
}) {
  const [f, setF] = useState<Frame>(frame);
  const [geocoding, setGeocoding] = useState(false);
  const [fetchingWx, setFetchingWx] = useState(false);
  const toast = useToast();
  const t = useT();

  // Persist a patch and mirror it locally so inputs stay responsive.
  const patch = (p: Partial<Frame>) => {
    setF((prev) => ({ ...prev, ...p }));
    void updateFrame(frame.id, p);
  };

  // Turn the manually-typed place name into coordinates for this frame.
  const findCoordinates = async () => {
    if (!f.location?.trim()) return toast("Type a location first");
    setGeocoding(true);
    try {
      const g = await geocodePlace(f.location);
      patch({ gps: { lat: g.lat, lon: g.lon }, location: g.place ?? f.location });
      toast(`Found ${g.place ?? "coordinates"}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't geocode");
    } finally {
      setGeocoding(false);
    }
  };

  // Retroactively fill the weather from the frame's place + date & time.
  const lookUpWeather = async () => {
    if (!f.dateTaken) return toast("Set the date & time first");
    setFetchingWx(true);
    try {
      let lat = f.gps?.lat;
      let lon = f.gps?.lon;
      if (lat === undefined || lon === undefined) {
        if (!f.location?.trim()) return toast("Add a location (or its GPS) first");
        const g = await geocodePlace(f.location);
        lat = g.lat;
        lon = g.lon;
        patch({ gps: { lat, lon }, location: g.place ?? f.location });
      }
      const wx = await lookupHistoricalWeather(lat, lon, f.dateTaken);
      const weather = (f.weather ?? []).includes(wx.weather)
        ? f.weather
        : [...(f.weather ?? []), wx.weather];
      patch({ weather });
      toast(
        `Weather: ${wx.weather}${wx.temperatureC !== undefined ? ` · ${Math.round(wx.temperatureC)}°C` : ""}`,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't fetch weather");
    } finally {
      setFetchingWx(false);
    }
  };

  // One-tap: carry the previous frame's shooting settings onto this one.
  const copyPrevious = () => {
    if (!prevFrame) return;
    patch({
      lensId: prevFrame.lensId,
      aperture: prevFrame.aperture,
      shutterSpeed: prevFrame.shutterSpeed,
      focalLength: prevFrame.focalLength,
      weather: prevFrame.weather ? [...prevFrame.weather] : undefined,
    });
  };

  // datetime-local wants "YYYY-MM-DDTHH:mm"; tolerate older date-only values.
  const dateValue = f.dateTaken ? f.dateTaken.slice(0, 16) : "";

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t("Frame")} {f.frameNumber}</h2>
        {prevFrame && (
          <button className="btn sm ghost" onClick={copyPrevious} title="Copy lens, aperture, shutter & weather from the previous frame">
            {t("⧉ Copy previous")}
          </button>
        )}
        <div className="spacer" />
        {f.scanFileName ? (
          <span className="badge ok">↔ {f.scanFileName}</span>
        ) : (
          <span className="badge warn">{t("no scan linked")}</span>
        )}
      </div>

      <Field label={t("Linked scan")}>
        <select
          value={f.scanFileName ?? ""}
          onChange={(e) => {
            const name = e.target.value || undefined;
            const thumb = scans.find((s) => s.name === name)?.thumbUrl;
            patch({ scanFileName: name, scanThumbUrl: thumb });
          }}
        >
          <option value="">{t("— not linked —")}</option>
          {/* keep an existing name available even if the file isn't re-imported */}
          {f.scanFileName && !scans.some((s) => s.name === f.scanFileName) && (
            <option value={f.scanFileName}>{f.scanFileName} (not re-imported)</option>
          )}
          {scans.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </Field>

      <Field label={t("Subject / title")}>
        <input value={f.title ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Harbour crane at dusk" />
      </Field>

      <Field label={t("Description")}>
        <textarea value={f.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <div className="field-row">
        <Field label={t("Lens")}>
          <select value={f.lensId ?? ""} onChange={(e) => patch({ lensId: e.target.value || undefined })}>
            <option value="">{t("— none —")}</option>
            {lenses.map((l) => <option key={l.id} value={l.id}>{l.make} {l.model}</option>)}
          </select>
        </Field>
        <Field label={t("Focal length override (mm)")}>
          <input value={f.focalLength ?? ""} onChange={(e) => patch({ focalLength: e.target.value })} placeholder="from lens" />
        </Field>
      </div>

      <Field label={t("Aperture (f-stop)")}>
        <input value={f.aperture ?? ""} onChange={(e) => patch({ aperture: e.target.value })} placeholder="5.6" style={{ marginBottom: 8 }} />
        <ChipPick options={APERTURE_SCALE} value={f.aperture} onChange={(v) => patch({ aperture: v })} />
      </Field>

      <Field label={t("Shutter speed")}>
        <input value={f.shutterSpeed ?? ""} onChange={(e) => patch({ shutterSpeed: e.target.value })} placeholder="1/125" style={{ marginBottom: 8 }} />
        <ChipPick options={SHUTTER_SPEEDS} value={f.shutterSpeed} onChange={(v) => patch({ shutterSpeed: v })} />
      </Field>

      <div className="field-row">
        <Field label={t("Date & time taken")}>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => patch({ dateTaken: e.target.value ? `${e.target.value}:00` : undefined })}
          />
        </Field>
        <Field label={t("Location (place)")}>
          <input value={f.location ?? ""} onChange={(e) => patch({ location: e.target.value })} placeholder="Hamburg, Speicherstadt" />
        </Field>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn sm" onClick={findCoordinates} disabled={geocoding}
          title="Look up GPS coordinates for the place name you typed">
          {geocoding ? t("🔎 Finding…") : t("🔎 Find coordinates")}
        </button>
        <button className="btn sm" onClick={lookUpWeather} disabled={fetchingWx}
          title="Fill the weather from this frame's place, date and time">
          {fetchingWx ? t("🌤 Fetching…") : t("🌤 Weather for this place & time")}
        </button>
      </div>
      <p className="hint" style={{ marginTop: -4, marginBottom: 12 }}>
        {t("The frame's location and time are yours to enter — the analog photo has none. Given a place and a date & time, the weather can be filled in retroactively from historical records.")}
      </p>

      <Field label={t("Weather")}>
        <ChipGroup<Weather>
          options={WEATHER_OPTIONS.map((w) => ({ ...w, label: t(w.label) }))}
          value={f.weather ?? []}
          onChange={(next) => patch({ weather: next })}
        />
      </Field>

      <Field label={t("Keywords (comma separated)")}>
        <input
          value={(f.keywords ?? []).join(", ")}
          onChange={(e) => patch({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
          placeholder="architecture, dusk, long exposure"
        />
      </Field>

      <div className="field-row">
        <Field label={t("GPS latitude")}>
          <input
            type="number" step="any"
            value={f.gps?.lat ?? ""}
            onChange={(e) => {
              const lat = e.target.value === "" ? undefined : Number(e.target.value);
              patch({ gps: lat === undefined ? undefined : { lat, lon: f.gps?.lon ?? 0, alt: f.gps?.alt } });
            }}
          />
        </Field>
        <Field label={t("GPS longitude")}>
          <input
            type="number" step="any"
            value={f.gps?.lon ?? ""}
            onChange={(e) => {
              const lon = e.target.value === "" ? undefined : Number(e.target.value);
              patch({ gps: lon === undefined ? undefined : { lat: f.gps?.lat ?? 0, lon, alt: f.gps?.alt } });
            }}
          />
        </Field>
      </div>

      <Field label={t("Notes")}>
        <textarea value={f.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>

      <p className="hint">
        {t("Values pulled from the roll: film {film}, camera {camera}. These are merged into every frame's metadata automatically on export.", { film: roll.filmStockId ? "✓" : "—", camera: roll.cameraId ? "✓" : "—" })}
      </p>
    </div>
  );
}
