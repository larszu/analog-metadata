import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../../data/db";
import type { Settings } from "../../domain/types";
import { Field, useToast } from "../components";

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="hint">Loading…</p>;

  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });

  const save = async () => {
    await saveSettings(settings);
    toast("Settings saved");
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Defaults applied to every export. Roll-level values always win over these.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <Field label="Default artist / creator">
          <input value={settings.defaultArtist ?? ""} onChange={(e) => update({ defaultArtist: e.target.value })} placeholder="Your name" />
        </Field>
        <Field label="Default copyright">
          <input value={settings.defaultCopyright ?? ""} onChange={(e) => update({ defaultCopyright: e.target.value })} placeholder="© 2026 Your Name" />
        </Field>
        <Field label="Software tag (written into metadata)">
          <input value={settings.softwareTag} onChange={(e) => update({ softwareTag: e.target.value })} />
        </Field>
        <button className="btn primary" onClick={save}>Save settings</button>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>About the export</h3>
        <p className="hint">
          Metadata is written as XMP sidecars (read by Lightroom Classic and Capture One) and, for JPEG
          scans, embedded directly into EXIF so it shows in Explorer and Finder. Your data lives locally
          on this device — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
