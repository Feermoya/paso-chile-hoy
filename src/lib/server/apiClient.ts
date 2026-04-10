import type { ClimaResponse, ConsolidadoResponse } from "@/lib/types/apiTypes";

const BASE_URL = "https://www.argentina.gob.ar/seguridad/pasosinternacionales";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function buildHeaders(): HeadersInit {
  return {
    "User-Agent": randomUA(),
    Accept: "application/json, */*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.5",
    Referer: "https://www.argentina.gob.ar/seguridad/pasosinternacionales",
    Origin: "https://www.argentina.gob.ar",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    DNT: "1",
  };
}

async function fetchWithRetry<T>(url: string, attempts = 3, delayMs = 1000): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, delayMs * 2 ** (i - 1)));
      }

      const res = await fetch(url, {
        headers: buildHeaders(),
        signal: AbortSignal.timeout(12_000),
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[apiClient] Attempt ${i + 1}/${attempts} failed for ${url}: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error(`All ${attempts} attempts failed for ${url}`);
}

function buildHeadersHtml(): HeadersInit {
  return {
    "User-Agent": randomUA(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.5",
    Referer: "https://www.argentina.gob.ar/seguridad/pasosinternacionales",
    Origin: "https://www.argentina.gob.ar",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    DNT: "1",
  };
}

async function fetchWithRetryText(url: string, attempts = 3, delayMs = 1000): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, delayMs * 2 ** (i - 1)));
      }

      const res = await fetch(url, {
        headers: buildHeadersHtml(),
        signal: AbortSignal.timeout(12_000),
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }

      return await res.text();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[apiClient] Attempt ${i + 1}/${attempts} failed for ${url}: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error(`All ${attempts} attempts failed for ${url}`);
}

export async function fetchConsolidado(routeId: number): Promise<ConsolidadoResponse> {
  return fetchWithRetry<ConsolidadoResponse>(`${BASE_URL}/detalle_consolidado/ruta/${routeId}`);
}

export async function fetchClima(lat: string, lng: string): Promise<ClimaResponse> {
  const la = lat.trim();
  const ln = lng.trim();
  return fetchWithRetry<ClimaResponse>(`${BASE_URL}/detalle_clima/${la}/${ln}`);
}

/** HTML público de la página de detalle (solo para pronóstico extendido). */
export async function fetchDetailHTML(routeId: number, routeSlug: string): Promise<string> {
  const url = `${BASE_URL}/detalle/ruta/${routeId}/${routeSlug}`;
  return fetchWithRetryText(url);
}
