import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "../../data/db";
import { exportAllData, importAllData } from "../../data/backup";
import { backupSummary, readBackup } from "../../core/backup";
import type { Settings } from "../../domain/types";
import { Field, useToast } from "../components";

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const doExport = async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analog-metadata-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded");
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    try {
      const preview = readBackup(text);
      const mode = confirm(
        `Import backup?\n\n${backupSummary(preview)}\n\nOK = REPLACE everything with the backup.\nCancel = MERGE into your current library.`,
      )
        ? "replace"
        : "merge";
      const bundle = await importAllData(text, mode);
      toast(`Imported (${mode}): ${backupSummary(bundle)}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed");
    }
  };

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
        <h3>Backup & restore</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Export your entire library — cameras, lenses, films, rolls and frames — to a single JSON file.
          Keep it safe or move it to another device, then import it back.
        </p>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={doExport}>⤓ Export backup (.json)</button>
          <button className="btn" onClick={() => importInput.current?.click()}>⤒ Import backup</button>
          <input ref={importInput} type="file" accept="application/json,.json" hidden
            onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
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
