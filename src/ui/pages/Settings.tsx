import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "../../data/db";
import { exportAllData, importAllData } from "../../data/backup";
import {
  connectSyncFile,
  disconnectSyncFile,
  fileSyncSupported,
  getLastSyncedAt,
  getSyncFileName,
  syncNow,
} from "../../data/sync";
import { backupSummary, readBackup } from "../../core/backup";
import type { Settings } from "../../domain/types";
import { Field, useToast } from "../components";
import { usePrefs, type Lang, type ThemeChoice } from "../../app/prefs";

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const [syncFile, setSyncFile] = useState<string | undefined>();
  const [lastSynced, setLastSynced] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const syncAvailable = fileSyncSupported();

  const refreshSync = async () => {
    setSyncFile(await getSyncFileName());
    setLastSynced(await getLastSyncedAt());
  };

  useEffect(() => {
    getSettings().then(setSettings);
    refreshSync();
  }, []);

  const connect = async (mode: "create" | "open") => {
    try {
      await connectSyncFile(mode);
      await refreshSync();
      toast("Sync file connected");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast(e instanceof Error ? e.message : "Couldn't connect");
    }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      const { changed, fileName } = await syncNow();
      await refreshSync();
      toast(changed > 0 ? `Synced ${fileName}: ${changed} updated` : `Synced ${fileName}: already up to date`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    await disconnectSyncFile();
    await refreshSync();
    toast("Sync file disconnected");
  };

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

  const { theme, setTheme, lang, setLang, t } = usePrefs();

  if (!settings) return <p className="hint">{t("Loading")}…</p>;

  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });

  const save = async () => {
    await saveSettings(settings);
    toast(t("Settings saved"));
  };

  const themeOpts: { v: ThemeChoice; label: string }[] = [
    { v: "system", label: t("System") },
    { v: "light", label: t("Light") },
    { v: "dark", label: t("Dark") },
  ];
  const langOpts: { v: Lang; label: string }[] = [
    { v: "en", label: t("English") },
    { v: "de", label: t("German") },
  ];

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Settings")}</h1>
          <p className="sub">{t("Defaults applied to every export. Roll-level values always win over these.")}</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3>{t("Appearance & language")}</h3>
        <Field label={t("Theme")}>
          <div className="chips">
            {themeOpts.map((o) => (
              <button key={o.v} className={`chip${theme === o.v ? " on" : ""}`} onClick={() => setTheme(o.v)}>{o.label}</button>
            ))}
          </div>
        </Field>
        <Field label={t("Language")}>
          <div className="chips">
            {langOpts.map((o) => (
              <button key={o.v} className={`chip${lang === o.v ? " on" : ""}`} onClick={() => setLang(o.v)}>{o.label}</button>
            ))}
          </div>
        </Field>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <Field label={t("Default artist / creator")}>
          <input value={settings.defaultArtist ?? ""} onChange={(e) => update({ defaultArtist: e.target.value })} placeholder="Your name" />
        </Field>
        <Field label={t("Default copyright")}>
          <input value={settings.defaultCopyright ?? ""} onChange={(e) => update({ defaultCopyright: e.target.value })} placeholder="© 2026 Your Name" />
        </Field>
        <Field label={t("Software tag (written into metadata)")}>
          <input value={settings.softwareTag} onChange={(e) => update({ softwareTag: e.target.value })} />
        </Field>
        <button className="btn primary" onClick={save}>{t("Save settings")}</button>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>{t("Backup & restore")}</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Export your entire library — cameras, lenses, films, rolls and frames — to a single JSON file.
          Keep it safe or move it to another device, then import it back.
        </p>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={doExport}>{t("⤓ Export backup (.json)")}</button>
          <button className="btn" onClick={() => importInput.current?.click()}>{t("⤒ Import backup")}</button>
          <input ref={importInput} type="file" accept="application/json,.json" hidden
            onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>{t("Cloud sync")} <span className="badge warn">beta</span></h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Point this at one JSON file kept in a synced drive (iCloud Drive, Dropbox, Google Drive…).
          “Sync now” merges the file with this device using last-write-wins, so several devices stay in
          step. For device-to-device without a drive, see the <b>Pair devices</b> page.
        </p>
        {syncAvailable ? (
          <>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              {syncFile ? (
                <>
                  <button className="btn primary" onClick={doSync} disabled={syncing}>
                    {syncing ? "⟳ Syncing…" : t("⟳ Sync now")}
                  </button>
                  <button className="btn ghost" onClick={disconnect}>{t("Disconnect")}</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => connect("create")}>{t("＋ Create sync file")}</button>
                  <button className="btn" onClick={() => connect("open")}>{t("📂 Use existing file")}</button>
                </>
              )}
            </div>
            {syncFile && (
              <p className="hint" style={{ marginTop: 8 }}>
                File: <b>{syncFile}</b>{lastSynced ? ` · last synced ${new Date(lastSynced).toLocaleString()}` : " · not synced yet"}
              </p>
            )}
          </>
        ) : (
          <p className="hint">
            One-tap sync needs the File System Access API (Chromium desktop / the desktop app). On this
            browser, use <b>Export backup</b> into your synced drive and <b>Import backup ▸ merge</b> on the
            other device — same last-write-wins merge.
          </p>
        )}
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>{t("About the export")}</h3>
        <p className="hint">
          Metadata is written as XMP sidecars (read by Lightroom Classic and Capture One) and, for JPEG
          scans, embedded directly into EXIF so it shows in Explorer and Finder. Your data lives locally
          on this device — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
