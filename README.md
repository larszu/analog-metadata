# Analog Metadata

Turn the handwritten notes from your analog film logbook into clean digital
metadata on your scans — ready for **Lightroom Classic**, **Capture One**, and
plain old **Windows Explorer / macOS Finder**.

One codebase, four platforms: **iOS, Android, Windows, macOS** (plus any modern
browser).

> Shoot film → jot aperture / shutter / lens / weather / subject on paper →
> scan the negatives → in this app, snap a photo of your log page, assign each
> handwritten row to its scan, and export XMP sidecars + embedded EXIF.

---

## Why

Analog shooters keep a paper log: per **camera** (make, model), per **roll**
(film stock, ISO, push/pull, lab, developer) and per **frame** (aperture,
shutter, lens, subject, weather, date, location). None of that survives the
scan — the scanner doesn't know what camera or lens you used. This app is the
bridge: it captures that layered data the way a logbook actually works and
writes it into the formats desktop photo apps already understand.

## What it does

- **Gear library** — cameras, lenses and film stocks (with a starter library of
  popular stocks as one-tap presets).
- **Rolls & frames** — create a roll (camera + film + frame count) and it
  pre-creates one frame per exposure. Log each frame with quick-pick aperture
  and shutter scales, weather chips, lens, subject, keywords, date, GPS.
- **Capture the log page** — use the device camera to photograph your
  handwritten sheet and keep it on-screen as a reference while you transcribe.
- **Assign scans intuitively** — import your digital scans, then either link
  each scan to a frame from a dropdown or **auto-assign in order** (scan 1 →
  frame 1 …). Thumbnails show which frames are done.
- **Export the bridge**:
  - `*.xmp` **sidecars** next to every scan — read natively by Lightroom
    Classic and Capture One (works for TIFF/DNG/RAW too).
  - **Embedded EXIF** for JPEG scans — camera, lens, aperture, shutter, ISO,
    date and GPS show up directly in Explorer/Finder, no sidecar needed.
  - `metadata.csv` and a `READ-ME.txt` with import steps, all zipped up.
- **Print your own logbook** — generate blank **DIN A6** log sheets as a PDF
  (one-per-page, or 2×A6 imposed on A4 to fold into a booklet), optionally
  pre-filled with a camera and film. Print or save straight from the app.

Everything is **local-first** — your data lives in the app's storage on your
device; nothing is uploaded.

---

## How your notes map to metadata

| Logbook field        | Level  | Written to                                                        |
|----------------------|--------|-------------------------------------------------------------------|
| Camera make / model  | camera | `tiff:Make` / `tiff:Model`, EXIF Make/Model                       |
| Lens                 | frame  | `exifEX:LensModel`, `aux:Lens` (Lightroom's Lens field)          |
| Aperture             | frame  | `exif:FNumber`                                                    |
| Shutter speed        | frame  | `exif:ExposureTime`                                               |
| Film ISO (+ push)    | roll   | `exif:ISOSpeedRatings`, keywords                                  |
| Focal length         | frame  | `exif:FocalLength`                                                |
| Subject / title      | frame  | `dc:title`, `photoshop:Headline`                                 |
| Description          | frame  | `dc:description`                                                  |
| Keywords + film + Wx | frame  | `dc:subject`                                                     |
| Date taken           | frame  | `xmp:CreateDate`, `photoshop:DateCreated`, `exif:DateTimeOriginal`|
| Location             | frame  | `Iptc4xmpCore:Location`                                          |
| GPS                  | frame  | `exif:GPSLatitude/Longitude`                                     |
| Artist / copyright   | roll   | `dc:creator` / `dc:rights`                                       |

The flattening rules live in one place: [`src/core/mapping.ts`](src/core/mapping.ts).

### Importing the export

- **Lightroom Classic** — put the `.xmp` files next to their scans, then
  *Metadata ▸ Read Metadata from File* (or just import the folder fresh).
- **Capture One** — reads sidecars on import; for already-imported images,
  *Image ▸ Metadata ▸ Load*.
- **Explorer / Finder** — use the JPEGs under `scans/`; the metadata is inside
  the file.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle into dist/
npm test           # unit tests (mapping, XMP, EXIF round-trip, ZIP, booklet)
```

## Build the native apps

The web app in `dist/` is wrapped natively by two well-supported toolchains.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

**Desktop — Windows & macOS (Tauri 2):** config in `src-tauri/`.

```bash
npm install -D @tauri-apps/cli
npx tauri icon path/to/logo.png   # generate app icons once
npx tauri dev                     # run the desktop app
npx tauri build                   # produce .dmg / .msi / .exe installers
```

**Mobile — iOS & Android (Capacitor):** config in `capacitor.config.ts`.

```bash
npm install @capacitor/core @capacitor/camera && npm install -D @capacitor/cli
npm run build
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios       # Xcode  → run/sign for iPhone & iPad
npx cap open android   # Android Studio → run/sign for Android
```

---

## Tech

React + TypeScript + Vite · Dexie (IndexedDB) for local storage · pdf-lib for
the booklet PDFs · piexifjs for EXIF embedding · a hand-rolled XMP writer for
Lightroom/Capture One interop · Tauri 2 (desktop) + Capacitor (mobile) shells.

## Status

Core is implemented and tested end-to-end (unit tests + a real-browser smoke of
the full add-gear → log-roll → assign → export/booklet flow). The device-camera
capture uses the platform camera on mobile and a file/webcam picker on desktop.
See `docs/ARCHITECTURE.md` for what's next (e.g. LAN pairing to push phone-shot
log photos to a desktop session).
