import { useEffect, useRef, useState } from "react";
import {
  ev100FromLuma,
  exposureTable,
  meanLuma,
  nearestApertureLabel,
} from "../../core/exposure";
import { getSettings, saveSettings } from "../../data/db";
import { Field, useToast } from "../components";

const COMMON_ISO = [50, 100, 125, 160, 200, 400, 800, 1600, 3200];

/** Reference EV100 values for common lighting — a reliable manual fallback. */
const SCENE_PRESETS: { label: string; ev: number; icon: string }[] = [
  { label: "Sunny (f/16)", ev: 15, icon: "☀️" },
  { label: "Slight overcast", ev: 14, icon: "🌤️" },
  { label: "Overcast", ev: 13, icon: "☁️" },
  { label: "Open shade / heavy cloud", ev: 12, icon: "⛅" },
  { label: "Sunset", ev: 12, icon: "🌅" },
  { label: "Bright interior", ev: 8, icon: "🏠" },
  { label: "Dim interior", ev: 6, icon: "🕯️" },
  { label: "Night street", ev: 4, icon: "🌙" },
];

const DEFAULT_CALIBRATION = 15;

export function LightMeter() {
  const toast = useToast();
  const [iso, setIso] = useState(400);
  const [ev, setEv] = useState(15);
  const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [liveEv, setLiveEv] = useState<number | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      if (typeof s.meterCalibrationEv === "number") setCalibration(s.meterCalibrationEv);
    });
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sample the camera preview and estimate EV while it's running.
  useEffect(() => {
    if (!cameraOn) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;
      const w = (canvas.width = 64);
      const h = (canvas.height = 64);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      // Centre-weighted: draw the middle square of the frame.
      const side = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - side) / 2;
      const sy = (video.videoHeight - side) / 2;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, w, h);
      const luma = meanLuma(ctx.getImageData(0, 0, w, h).data);
      const estimated = ev100FromLuma(luma, calibration);
      setLiveEv(estimated);
      setEv(Math.round(estimated * 10) / 10);
    }, 400);
    return () => window.clearInterval(id);
  }, [cameraOn, calibration]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      toast("Couldn't access the camera on this device");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setLiveEv(null);
  };

  // Set the calibration so the current live reading equals a chosen EV.
  const calibrateTo = async (targetEv: number) => {
    if (liveEv === null) return;
    const next = calibration + (targetEv - liveEv);
    setCalibration(next);
    await saveSettings({ meterCalibrationEv: next });
    toast(`Calibrated: current scene = EV ${targetEv}`);
  };

  const table = exposureTable(ev, iso);

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Light meter</h1>
          <p className="sub">
            Pick a lighting scene or point the camera at your subject, set your film speed, and read off a
            shutter speed for any aperture. Tap a pair to copy it.
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Reading</div>
              <div style={{ fontSize: "2.4rem", fontWeight: 700, lineHeight: 1 }}>EV {ev.toFixed(1)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>at ISO</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 650 }}>{iso}</div>
            </div>
          </div>

          <Field label="Film speed (ISO)">
            <div className="chips">
              {COMMON_ISO.map((v) => (
                <button key={v} className={`chip${iso === v ? " on" : ""}`} onClick={() => setIso(v)}>{v}</button>
              ))}
            </div>
          </Field>

          <Field label="Fine EV">
            <input type="range" min={2} max={18} step={0.3} value={ev} onChange={(e) => setEv(Number(e.target.value))} />
          </Field>

          <div style={{ marginTop: 6, marginBottom: 4, fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 550 }}>Lighting scene</div>
          <div className="chips">
            {SCENE_PRESETS.map((p) => (
              <button key={p.label} className={`chip${Math.abs(ev - p.ev) < 0.2 ? " on" : ""}`} onClick={() => setEv(p.ev)}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            {!cameraOn ? (
              <button className="btn" onClick={startCamera}>📷 Meter with camera</button>
            ) : (
              <button className="btn" onClick={stopCamera}>■ Stop camera</button>
            )}
            <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 8, marginTop: 10, display: cameraOn ? "block" : "none" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {cameraOn && (
              <div style={{ marginTop: 8 }}>
                <p className="hint">
                  Camera assist is approximate — calibrate it once against a known exposure or a handheld meter.
                </p>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="hint">Set current scene to:</span>
                  {[15, 13, 12, 8].map((t) => (
                    <button key={t} className="btn sm ghost" onClick={() => calibrateTo(t)}>EV {t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Exposure table</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Every aperture and the matching shutter speed for EV {ev.toFixed(1)} at ISO {iso}.
          </p>
          <div className="chips" style={{ gap: 8 }}>
            {table.map((row) => (
              <button
                key={row.aperture}
                className="chip"
                title={`f/${row.aperture} · ${row.shutter}`}
                onClick={() => {
                  navigator.clipboard?.writeText(`f/${row.aperture} ${row.shutter}`).catch(() => {});
                  toast(`Copied f/${row.aperture} · ${row.shutter}`);
                }}
              >
                <b>f/{row.aperture}</b> · {row.shutter}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Tip: a good hand-held starting point is around <b>f/{nearestApertureLabel(8)}</b>. Suggestions snap to the
            nearest marked shutter speed on your dial.
          </p>
        </div>
      </div>
    </div>
  );
}
