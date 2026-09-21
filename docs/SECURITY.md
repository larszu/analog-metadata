# Security & readiness audit

Audited on the merged `main`, 2026-08-05. Method: headless end-to-end run of the
whole journey (gear → roll → scans → assign → log → export) with the **exported
files validated**, plus a source review and dependency audit.

## Readiness

The core promise is verified working, not just rendering. A real exported ZIP was
unpacked and checked:

- `scan_01.xmp` — **well-formed XML**, with camera make/model, `exif:FNumber`,
  `exif:ExposureTime`, `aux:Lens` (the field Lightroom shows), pushed ISO 800 and
  `exif:DateTimeOriginal`.
- `scans/scan_01.jpg` — **EXIF readable by a standard reader** (Pillow): Make,
  Model, FNumber 5.6, ExposureTime 0.008, ISO 800, FocalLength 50, LensModel,
  DateTimeOriginal.
- `metadata.csv` + `READ-ME.txt` present.
- **Zero page/console errors** across the run.

Suitable for personal use. The beta surfaces below are the ones to know about.

## Findings

### Fixed

**CSV formula injection (CWE-1236) — was exploitable.**
`metadata.csv` wrote cell values verbatim, so a frame subject like
`=cmd|'/c calc'!A0` landed in the export and would be evaluated as a formula when
opened in Excel/LibreOffice. Confirmed against a real export, then fixed in
`core/csv.ts`: cells starting with `= + - @`, tab or CR are prefixed with `'`,
while plain numbers and numeric tuples (a `lat,lon` pair) keep their sign so
location data stays intact. Covered by tests in `core/csv.test.ts`.

### Accepted / documented

| Item | Assessment |
|---|---|
| **react-router 6.30.4** — 2 moderate advisories | Not reachable here: the SSR-hydration issue needs SSR (this app is client-only, `HashRouter`), and the open-redirect needs an attacker-controlled URL in `Link`/`navigate` — the only externally-influenced navigation (a scanned booklet QR) is gated on `db.rolls.get(id)`, so the id must already exist locally. The fix requires a **react-router 7 major migration**; deferred deliberately rather than bundled into a security fix. |
| **Tauri `"csp": null`** | The desktop shell ships without a Content-Security-Policy. Worth tightening before public distribution; not changed here because a CSP change can't be verified without running the Tauri build. |
| **Device pairing accepts a scanned SDP offer** | By design — it's how pairing works — but pairing with a hostile QR opens a data channel to that peer. The received payload is only shown as an image / offered as a download, never executed. There is **no size cap** on an incoming transfer, so a malicious peer could exhaust memory. Only pair with codes you can see on your own screen. |
| **OCR engine fetched from CDN** | The photo never leaves the device, but `tesseract.js` loads its worker/wasm/traineddata from a CDN on first use. README wording corrected to say so. Bundling the assets would make it fully offline. |
| **CI actions pinned to tags, not SHAs** | Standard practice, slight supply-chain exposure; pin to SHAs if the repo ever handles signing secrets. |

### Checked, no issue found

- **XMP injection** — payloads like `</dc:title><injected>` are correctly escaped;
  verified the exported sidecar stays well-formed XML.
- **XSS sinks** — no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or
  `new Function` anywhere in `src/`.
- **Backup import** — validates `app`/`version`/shape before touching the DB and
  rejects foreign or newer files.
- **Geocoding input** — place names are `encodeURIComponent`-escaped.
- **Secrets** — none in the source tree; no `.env` files.

## Reporting

Found something? Open an issue — but please don't include a real backup file, as
it contains your whole library.
