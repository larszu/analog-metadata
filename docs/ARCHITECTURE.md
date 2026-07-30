# Architecture

## Goal

Bridge a **handwritten analog film log** to **digital scan metadata** that
Lightroom Classic, Capture One and the OS file browsers understand — from a
single codebase that ships to iOS, Android, Windows and macOS.

## One codebase, four platforms

```
                    ┌─────────────────────────────┐
                    │   React + TypeScript (src/)  │   ← all app logic & UI
                    │   Dexie (IndexedDB) storage  │
                    └──────────────┬──────────────┘
                                   │ vite build → dist/
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
      ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
      │  Browser    │       │  Tauri 2    │       │ Capacitor   │
      │  (dev/web)  │       │ Win + macOS │       │ iOS+Android │
      └─────────────┘       └─────────────┘       └─────────────┘
```

The web layer is platform-agnostic. IndexedDB (via Dexie) is available in the
browser and inside both the Tauri (WKWebView / WebView2 / WebKitGTK) and
Capacitor (WKWebView / Android WebView) runtimes, so **the storage and all
business logic run unchanged everywhere**. The native shells add the window,
the file-save dialog and camera/OS integration.

Routing uses `createHashRouter` so deep links work from the `file://`/`app://`
origins native webviews load from.

## The data model is layered like a real logbook

Some facts are recorded once per **camera**, some once per **roll** of film,
and some per **frame** (exposure). See `src/domain/types.ts`.

```
Camera ─┐
Lens  ──┤            (referenced by)
Film ───┼──► Roll ──► Frame ──► linked scan file
        │     (per-roll:        (per-frame:
        │      film, ISO,        aperture, shutter,
        │      push/pull,        lens, subject,
        │      lab, dev,         weather, date,
        │      artist)           GPS, keywords)
```

On export, `src/core/mapping.ts#resolveFrameMetadata` **flattens** camera +
lens + roll + film + frame into one `ResolvedMetadata` record per scan. This is
the single source of truth for how logbook fields become metadata fields — every
exporter consumes it, so the rules never diverge.

## The metadata pipeline

```
ResolvedMetadata
   ├── core/xmp.ts      → <scan>.xmp   sidecar  (Lightroom + Capture One, all formats)
   ├── core/exif.ts     → embed EXIF   into JPEG (Explorer / Finder)
   ├── core/csv.ts      → metadata.csv          (archive / spreadsheets)
   └── core/export.ts   → zips it all with a READ-ME
```

- **XMP sidecars** are the primary, non-destructive path. Both Lightroom and
  Capture One merge a `basename.xmp` sitting next to `basename.tif/.jpg/.dng`.
  Namespaces are chosen for maximum pickup (`dc`, `xmp`, `photoshop`, `exif`,
  `exifEX`, `aux`, `tiff`, `Iptc4xmpCore`).
- **Embedded EXIF** is written only for JPEG (the one format we can safely
  re-encode client-side) so the data lives *inside* the file for the OS file
  browsers.

Both paths are covered by tests (`src/core/*.test.ts`), including a real EXIF
write→read round-trip and unzip-and-verify of the export bundle.

## The analog → digital assignment workflow

The `RollWorkspace` page (`src/ui/pages/RollWorkspace.tsx`) is where the bridge
is crossed:

1. **Capture the log page** with the device camera → stored on the roll as a
   reference image shown beside the frame editor.
2. **Import scans** → held in memory (full bytes for EXIF embedding) with
   generated thumbnails.
3. **Assign** → per-frame dropdown, or **auto-assign in order** which maps the
   naturally-sorted scans onto the frames (scan 1 → frame 1 …).
4. **Log** each frame with quick-pick aperture/shutter scales and weather chips.
5. **Export** the ZIP.

### Phone camera + desktop — today and next

The camera capture uses `<input type="file" accept="image/*" capture>`, which
opens the rear camera on mobile and a file/webcam picker on desktop — so on a
phone you photograph the log page in-app, and on the desktop you import your
scans, all within the same app.

**Planned LAN pairing** (see README status): a small local-network pairing so a
phone can push its freshly-shot log-page photos straight into an open desktop
session (QR-code handshake + a `tauri-plugin`-hosted local endpoint), giving the
"connect the phone to the laptop" flow without cables. The data model and
export already support it; only the transport is future work.

## Booklet printing

`src/core/booklet.ts` builds DIN A6 log sheets with pdf-lib — either one A6 page
per sheet, or two A6 imposed on a landscape A4 with a fold line. Header fields
(camera, film, ISO, date) can be pre-filled; the frame table matches the app's
fields so paper and app stay in sync.

## Project layout

```
src/
  domain/      types.ts, constants.ts        — the model + pick-lists/presets
  data/        db.ts (Dexie), repo.ts        — persistence + CRUD helpers
  core/        mapping, xmp, exif, csv,       — pure logic, fully unit-tested
               booklet, export
  ui/          Layout, components, pages/     — React UI
src-tauri/     Tauri 2 desktop shell config
capacitor.config.ts  — Capacitor mobile shell config
```
