/**
 * Client-side OCR of a captured log page (Tesseract.js — runs in the browser,
 * no cloud). Returns per-frame suggestions the user reviews before applying.
 *
 * Tesseract fetches its worker/core/traineddata on first use (cached afterwards).
 * In the packaged desktop/mobile apps you can point these at bundled assets via
 * createWorker options to stay fully offline.
 */
import { parseOcrLines, type FrameOcrSuggestion } from "../core/ocr";

export async function recognizeLogPage(
  imageDataUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<FrameOcrSuggestion[]> {
  // Lazy-load Tesseract (large) only when OCR is actually used.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: onProgress
      ? (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") onProgress(m.progress);
        }
      : undefined,
  });
  try {
    const { data } = await worker.recognize(imageDataUrl);
    const lines = data.lines.map((l) => l.text.trim()).filter(Boolean);
    return parseOcrLines(lines);
  } finally {
    await worker.terminate();
  }
}
