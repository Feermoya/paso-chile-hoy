const PRENSA_MENDOZA_URL =
  "https://prensa.mendoza.gob.ar/estado-del-tiempo-y-pasos-internacionales/";

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Descarga la página de Prensa Mendoza y extrae un fragmento centrado en Alta Montaña
 * hasta antes de “Paso Cristo Redentor” (incluye Viernes / Sábado / Domingo cuando están en el cuerpo).
 */
export async function fetchMendozaForecast(): Promise<string | null> {
  try {
    const res = await fetch(PRENSA_MENDOZA_URL, {
      headers: {
        "User-Agent": "PasoChileHoyBot/1.0",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const html = await res.text();

    const lower = html.toLowerCase();
    const start = lower.indexOf("alta montaña:");
    if (start === -1) return null;

    const endMarker = "paso cristo redentor";
    const end = lower.indexOf(endMarker, start + 12);
    const byPasos = end === -1 ? null : html.slice(start, end).trim();

    if (byPasos && byPasos.length >= 50) {
      return byPasos;
    }

    const match = html.match(/Alta Montaña:[\s\S]*?Temperaturas?\s+promedio/i);
    if (match?.[0]?.trim()) {
      return match[0].trim();
    }

    return byPasos && byPasos.length > 0 ? byPasos : null;
  } catch (e) {
    console.error("[mendoza-forecast] error", e);
    return null;
  }
}
