import { useState } from "react";
import { updateFrame } from "../../data/repo";
import { captureGeoWeather } from "../../data/geo";
import type { Frame, Lens, Roll, Weather } from "../../domain/types";
import { APERTURE_SCALE, SHUTTER_SPEEDS, WEATHER_OPTIONS } from "../../domain/constants";
import { Field, ChipGroup, ChipPick, useToast } from "../components";

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
  const [locating, setLocating] = useState(false);
  const toast = useToast();

  // Persist a patch and mirror it locally so inputs stay responsive.
  const patch = (p: Partial<Frame>) => {
    setF((prev) => ({ ...prev, ...p }));
    void updateFrame(frame.id, p);
  };

  // Auto-fill GPS, place name and weather from the device + free web services.
  const autoLocate = async () => {
    setLocating(true);
    try {
      const g = await captureGeoWeather();
      const weather =
        g.weather && !(f.weather ?? []).includes(g.weather)
          ? [...(f.weather ?? []), g.weather]
          : f.weather;
      patch({
        gps: { lat: g.lat, lon: g.lon, alt: g.alt },
        location: g.place ?? f.location,
        weather,
      });
      toast(
        `Located${g.place ? ` · ${g.place}` : ""}${
          g.temperatureC !== undefined ? ` · ${Math.round(g.temperatureC)}°C` : ""
        }`,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't get location");
    } finally {
      setLocating(false);
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

  const dateValue = f.dateTaken ? f.dateTaken.slice(0, 10) : "";

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Frame {f.frameNumber}</h2>
        {prevFrame && (
          <button className="btn sm ghost" onClick={copyPrevious} title="Copy lens, aperture, shutter & weather from the previous frame">
            ⧉ Copy previous
          </button>
        )}
        <div className="spacer" />
        {f.scanFileName ? (
          <span className="badge ok">↔ {f.scanFileName}</span>
        ) : (
          <span className="badge warn">no scan linked</span>
        )}
      </div>

      <Field label="Linked scan">
        <select
          value={f.scanFileName ?? ""}
          onChange={(e) => {
            const name = e.target.value || undefined;
            const thumb = scans.find((s) => s.name === name)?.thumbUrl;
            patch({ scanFileName: name, scanThumbUrl: thumb });
          }}
        >
          <option value="">— not linked —</option>
          {/* keep an existing name available even if the file isn't re-imported */}
          {f.scanFileName && !scans.some((s) => s.name === f.scanFileName) && (
            <option value={f.scanFileName}>{f.scanFileName} (not re-imported)</option>
          )}
          {scans.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Subject / title">
        <input value={f.title ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Harbour crane at dusk" />
      </Field>

      <Field label="Description">
        <textarea value={f.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <div className="field-row">
        <Field label="Lens">
          <select value={f.lensId ?? ""} onChange={(e) => patch({ lensId: e.target.value || undefined })}>
            <option value="">— none —</option>
            {lenses.map((l) => <option key={l.id} value={l.id}>{l.make} {l.model}</option>)}
          </select>
        </Field>
        <Field label="Focal length override (mm)">
          <input value={f.focalLength ?? ""} onChange={(e) => patch({ focalLength: e.target.value })} placeholder="from lens" />
        </Field>
      </div>

      <Field label="Aperture (f-stop)">
        <input value={f.aperture ?? ""} onChange={(e) => patch({ aperture: e.target.value })} placeholder="5.6" style={{ marginBottom: 8 }} />
        <ChipPick options={APERTURE_SCALE} value={f.aperture} onChange={(v) => patch({ aperture: v })} />
      </Field>

      <Field label="Shutter speed">
        <input value={f.shutterSpeed ?? ""} onChange={(e) => patch({ shutterSpeed: e.target.value })} placeholder="1/125" style={{ marginBottom: 8 }} />
        <ChipPick options={SHUTTER_SPEEDS} value={f.shutterSpeed} onChange={(v) => patch({ shutterSpeed: v })} />
      </Field>

      <Field label="Weather">
        <ChipGroup<Weather>
          options={WEATHER_OPTIONS}
          value={f.weather ?? []}
          onChange={(next) => patch({ weather: next })}
        />
      </Field>

      <div className="field-row">
        <Field label="Date taken">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => patch({ dateTaken: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          />
        </Field>
        <Field label="Location (place)">
          <input value={f.location ?? ""} onChange={(e) => patch({ location: e.target.value })} placeholder="Hamburg, Speicherstadt" />
        </Field>
      </div>

      <Field label="Keywords (comma separated)">
        <input
          value={(f.keywords ?? []).join(", ")}
          onChange={(e) => patch({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
          placeholder="architecture, dusk, long exposure"
        />
      </Field>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={autoLocate} disabled={locating}
          title="Fill GPS, place name and weather from your current location">
          {locating ? "📍 Locating…" : "📍 GPS + weather"}
        </button>
      </div>

      <div className="field-row">
        <Field label="GPS latitude">
          <input
            type="number" step="any"
            value={f.gps?.lat ?? ""}
            onChange={(e) => {
              const lat = e.target.value === "" ? undefined : Number(e.target.value);
              patch({ gps: lat === undefined ? undefined : { lat, lon: f.gps?.lon ?? 0, alt: f.gps?.alt } });
            }}
          />
        </Field>
        <Field label="GPS longitude">
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

      <Field label="Notes">
        <textarea value={f.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>

      <p className="hint">
        Values pulled from the roll: film {roll.filmStockId ? "✓" : "—"}, camera {roll.cameraId ? "✓" : "—"}.
        These are merged into every frame's metadata automatically on export.
      </p>
    </div>
  );
}
