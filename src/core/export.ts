/**
 * Bundles a roll's metadata into a downloadable ZIP:
 *   /<scan>.xmp        sidecars for every linked scan (Lightroom / Capture One)
 *   /scans/<scan>.jpg  JPEG scans with metadata embedded in EXIF (Explorer/Finder)
 *   metadata.csv       a flat table of everything
 *   READ-ME.txt        import instructions
 *
 * Sidecars are always written (they work for TIFF/DNG/RAW too). Embedded JPEGs
 * are only produced when the user supplied the scan file and it is a JPEG.
 */
import JSZip from "jszip";
import type { ResolvedMetadata } from "./mapping";
import { buildXmp, sidecarName } from "./xmp";
import { embedExif, isJpeg } from "./exif";
import { framesToCsv } from "./csv";

export interface ExportItem {
  resolved: ResolvedMetadata;
  /** The actual scan bytes as a data URL, if the user imported it. */
  scanDataUrl?: string;
}

export interface ExportResult {
  blob: Blob;
  sidecarCount: number;
  embeddedCount: number;
  skipped: string[];
}

const README = (rollLabel: string) => `Analog Metadata export — ${rollLabel}
=====================================================

This bundle contains metadata for your scanned film frames.

1) XMP sidecars (*.xmp)
   One sidecar sits next to each scan, sharing its base name
   (scan_001.tif -> scan_001.xmp). Put the .xmp file in the SAME folder as the
   matching scan, then:
     - Lightroom Classic: right-click the photo(s) > Metadata > Read Metadata
       from File. (Or import the folder fresh and Lightroom reads them.)
     - Capture One: it reads the sidecar automatically on import; for images
       already imported, select them and choose Image > Metadata > Load /
       Sync Metadata.

2) /scans/*.jpg
   If you supplied JPEG scans, copies with the metadata written straight into
   their EXIF are here. These show camera, lens, aperture, shutter, ISO, date
   and GPS directly in Windows Explorer and macOS Finder — no sidecar needed.

3) metadata.csv
   A spreadsheet of every frame for your own records.

Tip: keep the .xmp files with their scans and your notes stay attached forever.
`;

export async function buildExportZip(
  rollLabel: string,
  items: ExportItem[],
): Promise<ExportResult> {
  const zip = new JSZip();
  const scansFolder = zip.folder("scans");
  let sidecarCount = 0;
  let embeddedCount = 0;
  const skipped: string[] = [];

  for (const { resolved, scanDataUrl } of items) {
    const name = resolved.scanFileName;
    if (!name) {
      skipped.push(`frame ${resolved.frameNumber} (no scan linked)`);
      continue;
    }

    // Always write a sidecar.
    zip.file(sidecarName(name), buildXmp(resolved));
    sidecarCount++;

    // Embed into JPEG when we have the bytes.
    if (scanDataUrl && isJpeg(name)) {
      try {
        const embedded = embedExif(scanDataUrl, resolved);
        const base64 = embedded.split(",")[1] ?? "";
        scansFolder?.file(name, base64, { base64: true });
        embeddedCount++;
      } catch {
        skipped.push(`${name} (could not embed EXIF)`);
      }
    } else if (scanDataUrl) {
      // Non-JPEG scan: store it untouched alongside its sidecar.
      const comma = scanDataUrl.indexOf(",");
      if (comma > 0) {
        scansFolder?.file(name, scanDataUrl.slice(comma + 1), { base64: true });
      }
    }
  }

  zip.file("metadata.csv", framesToCsv(items.map((i) => i.resolved)));
  zip.file("READ-ME.txt", README(rollLabel));

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, sidecarCount, embeddedCount, skipped };
}
