import { toBlob } from "html-to-image";
import type { ForecastShareData } from "@/types/forecast-share";

const PNG_TYPE = "image/png";

function safeFileName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function renderForecastShareBlob(node: HTMLElement): Promise<Blob> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 2,
    // Evita leer cssRules de CSS remotos (p. ej. fonts.googleapis.com), que lanza SecurityError por CORS.
    skipFonts: true,
    // Sin color de relleno: el PNG usa el fondo real del nodo (claro u oscuro según la card).
  });

  if (!blob) {
    throw new Error("SHARE_PNG_GENERATION_FAILED");
  }

  return blob;
}

export function blobToPngFile(blob: Blob, data: ForecastShareData): File {
  const slug = safeFileName(data.slug || data.passName || "pronostico");
  const datePart = data.generatedAtIso.slice(0, 10);
  const fileName = `pronostico-${slug}-${datePart}.png`;
  return new File([blob], fileName, {
    type: PNG_TYPE,
    lastModified: Date.now(),
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function canShareForecastFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [file] });
}

export async function shareForecastFile(file: File, data: ForecastShareData): Promise<boolean> {
  if (!canShareForecastFile(file)) return false;
  await navigator.share({
    title: `${data.title} - ${data.passName}`,
    text: `${data.title} - ${data.passName}`,
    files: [file],
    url: data.sourceUrl,
  });
  return true;
}
