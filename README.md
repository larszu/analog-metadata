<div align="center">

# 🎞️ Analog Metadata

### Turn your handwritten film log into clean digital metadata

Bridge the notes from your analog logbook straight onto your scans — ready for
**Lightroom Classic**, **Capture One**, and **Windows Explorer / macOS Finder**.

**One codebase → iOS · Android · Windows · macOS** _(and any modern browser)_

<sub>React + TypeScript · local-first · no account, no upload</sub>

</div>

---

<div align="center">

![The roll workspace](docs/screenshots/workspace.png)

<sub>The assignment workspace: your log-page photo on the left, one frame per exposure with auto-linked scan thumbnails, quick-pick aperture & shutter scales and weather chips on the right.</sub>

</div>

---

## The problem

Analog shooters keep a paper log. Some facts are noted once per **camera**
(make, model), some once per **roll** (film stock, ISO, push/pull, lab,
developer) and some per **frame** (aperture, shutter, lens, subject, weather,
date, location). **None of it survives the scan** — the scanner has no idea what
camera or lens you used.

**Analog Metadata is the bridge.** It captures that layered data the way a
logbook actually works, then writes it into the formats desktop photo apps
already understand.

> Shoot film → jot your settings on paper → scan the negatives → in the app,
> snap a photo of your log page, assign each handwritten row to its scan, and
> export XMP sidecars + embedded EXIF.

## What it does

- 📷 **Gear library** — cameras, lenses and film stocks (popular stocks as
  one-tap presets).
- 🎬 **Rolls & frames** — create a roll (camera + film + frame count) and it
  pre-creates one frame per exposure. Log each with quick-pick aperture and
  shutter scales, weather chips, lens, subject, keywords, date and GPS.
- 🖐️ **Capture the log page** — photograph your handwritten sheet with the
  device camera and keep it on-screen while you transcribe.
- 🔗 **Assign scans intuitively** — import your scans, then **auto-assign in
  order** (scan 1 → frame 1 …) or link each by hand. Thumbnails show progress.
- ⤓ **Export the bridge** — XMP sidecars, embedded EXIF for JPEGs, a CSV and a
  READ-ME, zipped up.
- 🖨️ **Print your own logbook** — generate blank **DIN A6** log sheets as a PDF
  to carry with your camera.

Everything is **local-first** — your data lives on your device; nothing is
uploaded.

## Screenshots

| Overview | Roll workspace |
|---|---|
| ![Overview](docs/screenshots/dashboard.png) | ![Workspace](docs/screenshots/workspace.png) |

| Film stocks | Print DIN A6 booklet | Mobile |
|---|---|---|
| ![Films](docs/screenshots/films.png) | ![Booklet](docs/screenshots/booklet.png) | <img src="docs/screenshots/mobile.png" width="240" alt="Mobile"> |

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

**Importing the export**
- **Lightroom Classic** — put the `.xmp` files next to their scans, then
  *Metadata ▸ Read Metadata from File* (or import the folder fresh).
- **Capture One** — reads sidecars on import; for imported images,
  *Image ▸ Metadata ▸ Load*.
- **Explorer / Finder** — use the JPEGs under `scans/`; metadata is inside them.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle into dist/
npm test           # unit tests (mapping, XMP, EXIF round-trip, ZIP, booklet)
```

## Build the native apps

The web app in `dist/` is wrapped natively by two toolchains — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

**Desktop — Windows & macOS (Tauri 2):** config in `src-tauri/`.

```bash
npm install -D @tauri-apps/cli
npx tauri icon path/to/logo.png
npx tauri dev            # run the desktop app
npx tauri build          # .dmg / .msi / .exe installers
```

**Mobile — iOS & Android (Capacitor):** config in `capacitor.config.ts`.

```bash
npm install @capacitor/core @capacitor/camera && npm install -D @capacitor/cli
npm run build
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios | android   # run & sign in Xcode / Android Studio
```

## How it compares

There's a lively field of film-log apps. Here's an honest read of where we sit
and what they do that we don't yet.

| Capability | Analog Metadata | Frames | Pellica | EXIF Notes | Typical iOS logbooks |
|---|:---:|:---:|:---:|:---:|:---:|
| XMP sidecars (Lightroom **+** Capture One) | ✅ | ✅ | – | via ExifTool | rare |
| Embed EXIF into JPEG scans | ✅ | ✅ (also TIFF/DNG on Mac) | – | via ExifTool | rare |
| **Windows + macOS desktop app** | ✅ | Mac only | – | – | – |
| iOS + Android | ✅ (one codebase) | iOS | ✅ | Android | mostly iOS |
| **Print your own DIN A6 log booklets** | ✅ | – | – | – | – |
| Local-first / no account | ✅ | ✅ | partial | ✅ | varies |
| Built-in light meter | ❌ | – | ✅ | – | ✅ |
| Auto GPS + weather capture | ❌ (manual) | – | ✅ | partial | some |
| DX / barcode frame decoding | ❌ | – | ✅ | – | – |
| Cloud sync across devices | ❌ | iCloud | Pro | – | iCloud |
| Lab directory | ❌ | – | ✅ (1200+) | – | some |

**Where we already win:** true four-platform reach from a single codebase
(most rivals are iOS-only or mobile-only), a real Windows/macOS desktop app,
metadata that *both* Lightroom and Capture One read, and printable A6 booklets
that tie the paper and digital sides together.

### Roadmap — features worth adding

Prioritised from the competitive scan (see the research write-up in
[`docs/COMPARISON.md`](docs/COMPARISON.md)):

1. **Cloud / multi-device sync** — log on the phone, export on the desktop.
   (Local-first today; sync is the most-requested gap.)
2. **Wireless phone ⇆ desktop pairing** — QR handshake so a phone pushes its
   log-page photo straight into an open desktop session (no cable). The data
   model and export already support it; only the transport is missing.
3. **Built-in light meter** — meter with the phone camera and write the reading
   straight onto the frame.
4. **Auto GPS + weather** — capture location and conditions in the background
   while shooting, with reverse-geocoded place names.
5. **Write EXIF into TIFF / DNG directly** — bundle ExifTool in the Tauri
   desktop build so any scan format gets embedded metadata, not just JPEG.
6. **DX / edge-barcode decoding** — photograph the film rebate to auto-order
   and auto-assign frames.
7. **Printed-booklet QR tie-in** — stamp each printed A6 sheet with a QR code
   that re-links it to its roll when you photograph it back in.
8. **Shooting calculators** — depth-of-field / hyperfocal, reciprocity-failure
   and development timers.
9. **Stats & insights** — most-used film, camera and aperture; rolls over time.
10. **Import/round-trip** — read CSV/JSON exports from other logs and Lightroom.

## Tech

React + TypeScript + Vite · Dexie (IndexedDB) · pdf-lib (booklet PDFs) ·
piexifjs (EXIF embedding) · a hand-rolled XMP writer for Lightroom/Capture One
interop · Tauri 2 (desktop) + Capacitor (mobile) shells.

## Status

Core is implemented and tested end-to-end — **22 unit tests** (parsing, XMP,
EXIF write→read round-trip, ZIP bundle, booklet PDF) plus a real-browser smoke
of the full **add-gear → log-roll → assign → export/booklet** flow. The
screenshots above are captured headlessly from that build.
