const PRENSA_MENDOZA_URL =
  "https://prensa.mendoza.gob.ar/estado-del-tiempo-y-pasos-internacionales/";

const FETCH_TIMEOUT_MS = 15_000;
const SUCCESS_CACHE_MS = 10 * 60 * 1000;

/**
 * CloudFront de prensa.mendoza.gob.ar responde 403 a `PasoChileHoyBot/1.0`.
 * Un UA de navegador es el que hoy deja bajar el parte público.
 */
const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const START_MARKERS = [
  "pronóstico para hoy",
  "pronostico para hoy",
  "reporte meteorológico",
  "reporte meteorologico",
  "alta montaña:",
  "alta montana:",
] as const;

let successCache: { at: number; html: string } | null = null;

function earliestIndex(haystack: string, needles: readonly string[], from = 0): number {
  let best = -1;
  for (const needle of needles) {
    const i = haystack.indexOf(needle, from);
    if (i >= 0 && (best === -1 || i < best)) best = i;
  }
  return best;
}

function endAfterMarker(lower: string, markerAt: number, hardEnd: number): number {
  const h3 = lower.indexOf("</h3>", markerAt);
  const p = lower.indexOf("</p>", markerAt);
  const cuts = [h3, p].filter((i) => i > markerAt && i < hardEnd);
  if (cuts.length) return Math.min(...cuts) + 5;
  return Math.min(hardEnd, markerAt + 180);
}

/**
 * Recorta el parte: pronóstico del día, reporte por jornada y estado de pasos.
 * Incluye «Sistema Integrado Cristo Redentor» y «Paso Pehuenche» (el formato viejo
 * cortaba antes de «Paso Cristo Redentor» y perdía el estado).
 */
export function extractMendozaBulletinFromHtml(html: string): string | null {
  const lower = html.toLowerCase();
  const start = earliestIndex(lower, START_MARKERS);
  if (start < 0) return null;

  const footer = lower.indexOf("<footer", start);
  let end = footer > start ? footer : html.length;

  const pehuenche = lower.indexOf("paso pehuenche", start);
  const cristoHeading = earliestIndex(
    lower,
    ["sistema integrado cristo redentor", "paso cristo redentor"],
    start,
  );

  if (pehuenche >= start && pehuenche < end) {
    end = endAfterMarker(lower, pehuenche, end);
  } else if (cristoHeading >= start && cristoHeading < end) {
    end = endAfterMarker(lower, cristoHeading, end);
  }

  let slice = html
    .slice(start, end)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  let prev = "";
  while (slice !== prev) {
    prev = slice;
    slice = slice.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
  }
  slice = slice.replace(/<\/?figure\b[^>]*>/gi, " ").replace(/<img\b[^>]*>/gi, " ").trim();

  const textish = slice.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (textish.length < 50) return null;
  return slice;
}

/**
 * Descarga el parte de Prensa Mendoza (alta montaña, jornadas y estado de pasos).
 */
export async function fetchMendozaForecast(): Promise<string | null> {
  const now = Date.now();
  if (successCache && now - successCache.at < SUCCESS_CACHE_MS) {
    return extractMendozaBulletinFromHtml(successCache.html);
  }

  try {
    const res = await fetch(PRENSA_MENDOZA_URL, {
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn("[mendoza-forecast] HTTP", res.status);
      return null;
    }

    const html = await res.text();
    const bulletin = extractMendozaBulletinFromHtml(html);
    if (!bulletin) {
      console.warn("[mendoza-forecast] parte no reconocido en el HTML");
      return null;
    }

    successCache = { at: now, html };
    return bulletin;
  } catch (e) {
    console.error("[mendoza-forecast] error", e);
    return null;
  }
}
