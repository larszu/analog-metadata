# Similar tools & feature gap analysis

A survey of existing analog film-logging apps (July 2026) and what Analog
Metadata should learn from them. Sources are linked at the bottom.

## The landscape

| App | Platforms | Cost | What stands out |
|---|---|---|---|
| **Frames** | iOS, macOS | paid | Closest to us on export: writes XMP sidecars **and** embeds metadata into JPEG/JXL/TIFF/DNG on the Mac; film stock, exposure, gear, geolocation and notes travel inside the file. iOS-first, Apple-only. |
| **Pellica** | iOS, Android | free (+ Pro) | Feature-rich shooting companion: built-in light meter (spot/center/evaluative, ±⅓ stop), **auto GPS + weather** in the background, **DX/edge-barcode decoding** to assign frames, a 1200+ **lab directory**, search by stock/camera/lens/city/weather, cloud sync on Pro. |
| **EXIF Notes** | Android (open source) | free | The original "inject metadata into film" tool. Exports a file you run through **ExifTool** to write EXIF onto scans. No sidecar/desktop UI of its own. |
| **Rollio** | iOS | free/paid | Light meter + per-frame logging (aperture, shutter, notes), roll management with film/ISO/camera. |
| **MyFilmRoll** | iOS | paid | Per-frame aperture/shutter/lens/lighting/notes, GPS, custom stocks & gear, iCloud sync. |
| **Film Logbook** | iOS | paid | Rolls with camera/lens/film/ISO/notes; per-frame aperture/shutter/exposure comp/meter readings; location; iCloud sync. |
| **Filmfolio** | iOS | paid | Light meter + shot logging + cloud storage for scans, organised by roll. |
| **FilmMeter** | iOS | free | Camera/lens profiles linked to rolls, light meter, hyperfocal calculator. |
| **Light Meter & Logbook** | Android, iOS | free | Light meter with a logbook attached. |

## What almost everyone has that we don't

1. **Built-in light meter.** The single most common feature — meter with the
   phone before you shoot. We have none.
2. **Automatic GPS + weather.** Rivals attach location and conditions in the
   background; we only take them manually.
3. **Cloud / multi-device sync** (usually iCloud). We are deliberately
   local-first, but "log on phone, export on desktop" needs a sync or pairing
   story.

## Advanced features only the leaders have

4. **DX / edge-barcode decoding** (Pellica) — photograph the film rebate to
   auto-order and auto-assign frames.
5. **Direct EXIF into TIFF/DNG/RAW** (Frames, on Mac) — we embed JPEG only and
   fall back to sidecars elsewhere. Bundling ExifTool in the Tauri desktop build
   would close this.
6. **Lab directory** (Pellica, 1200+ labs) — pick your lab, track dev orders.

## Where we already lead

- **Four platforms from one codebase**, including a **real Windows + macOS
  desktop app** — most rivals are iOS-only or mobile-only. Desktop is exactly
  where scans and Lightroom/Capture One live.
- **Metadata both Lightroom and Capture One read** (broad XMP namespace
  coverage) plus JPEG EXIF embedding for Explorer/Finder.
- **Print-your-own DIN A6 log booklets** — none of the surveyed apps close the
  loop back to paper.
- **Local-first & free/open** — no account, no upload.

## Opportunities unique to us

- **Printed-booklet QR tie-in.** Because we generate the paper log, we can stamp
  each A6 sheet with a QR code that re-links it to its roll when photographed
  back in — a paper↔digital loop no competitor has.
- **Wireless phone ⇆ desktop pairing.** A LAN/QR handshake to push a phone-shot
  log page into an open desktop session, fitting the "connect phone to laptop"
  workflow without cables.

## Implemented from this analysis

The most-praised competitor features and the most-requested gaps have shipped:

- ✅ **Built-in light meter** (scene presets + camera assist + exposure table)
- ✅ **Fast one-tap logging** (copy previous frame, bulk apply-to-empty)
- ✅ **Large film-stock preset library** (45+)
- ✅ **Full JSON backup & restore** (the loudest "please add export" complaint)
- ✅ **Global search** across rolls, frames and gear
- ✅ **Insights / stats** (most-used films, cameras, lenses, apertures)
- ✅ **Cloud sync** — merge a JSON file in any synced drive (last-write-wins)
- ✅ **Wireless phone ⇆ desktop pairing** — WebRTC data channel + QR handshake,
  no server, no cable; sends a log-page photo phone→desktop
- ✅ **Auto GPS + weather** — device location + Open-Meteo conditions +
  BigDataCloud reverse-geocoded place name, one tap

## Still prioritised

1. Direct EXIF into TIFF/DNG via bundled ExifTool (desktop)
2. DX / edge-barcode frame decoding
3. Printed-booklet QR tie-in
4. Shooting calculators (DoF/hyperfocal, reciprocity, dev timers)
5. Real-time sync via a hosted relay (automatic multi-device)
6. Import/round-trip from other logs & Lightroom

## Sources

- [Frames — withframes.com](https://withframes.com/) · [App Store](https://apps.apple.com/us/app/film-photography-log-frames/id6744057317)
- [Pellica — pellica.app](https://pellica.app/) · [Film roll tracker](https://pellica.app/film-roll-tracker/) · [Best light meter apps 2026](https://pellica.app/blog/best-light-meter-apps-film-photography-2026/)
- [Bridging Analog Photography and Digital Metadata with Exif Notes — 35mmc](https://www.35mmc.com/21/05/2020/bridging-analog-photography-and-digital-metadata-with-exif-notes-by-babak-farshchian/)
- [Rollio — App Store](https://apps.apple.com/us/app/rollio-light-meter-film-log/id6744120369)
- [MyFilmRoll — App Store](https://apps.apple.com/de/app/myfilmroll-film-log-tracker/id6749644346?l=en-GB)
- [Film Logbook — App Store](https://apps.apple.com/us/app/film-logbook/id1520402017)
- [Filmfolio — App Store](https://apps.apple.com/us/app/filmfolio-log-light-meter/id1604866949)
- [Free FilmMeter App — PetaPixel](https://petapixel.com/2026/02/10/free-filmmeter-app-is-an-analog-photographers-best-friend/)
- [What is an XMP File? — PhotoTraces](https://www.phototraces.com/lightroom-tutorials/what-is-an-xmp-file/)
- [Save metadata to external sidecar files — Adobe](https://helpx.adobe.com/lightroom-classic/help/create-xmp-acr-files.html)
