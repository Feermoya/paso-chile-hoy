import type { HtmlFetchResult } from "@/lib/server/types/source";
import { officialPageFetchHeaders } from "@/utils/scraper";

const DEFAULT_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1000;
const MAX_ATTEMPTS = 2;

export type FetchHtmlOptions = {
  timeoutMs?: number;
  /** Solo para diagnóstico en desarrollo (sin URL ni datos sensibles en prod). */
  slug?: string;
};

function logFetchFailure(
  slug: string,
  statusCode: number | null,
  reason: string,
  attempt: number,
): void {
  if (!import.meta.env.DEV) return;
  const st = statusCode === null ? "—" : String(statusCode);
  console.warn(
    `[paso-chile-hoy][fetch] slug=${slug} attempt=${attempt}/${MAX_ATTEMPTS} status=${st} reason=${reason}`,
  );
}

function shouldRetryHttpStatus(status: number): boolean {
  return status === 403 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function doOneFetch(
  url: string,
  timeoutMs: number,
): Promise<{ ok: true; result: HtmlFetchResult } | { ok: false; error: "timeout" | "http"; result: HtmlFetchResult }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: officialPageFetchHeaders(),
      redirect: "follow",
      cache: "no-store",
    });
    const html = await res.text();
    const result: HtmlFetchResult = {
      html,
      statusCode: res.status,
      finalUrl: res.url,
    };
    if (!res.ok && shouldRetryHttpStatus(res.status)) {
      return { ok: false, error: "http", result };
    }
    return { ok: true, result };
  } catch (e) {
    const isAbort =
      e instanceof Error &&
      (e.name === "AbortError" || e.name === "TimeoutError" || e.message.includes("aborted"));
    if (isAbort) {
      return {
        ok: false,
        error: "timeout",
        result: { html: "", statusCode: 0, finalUrl: url },
      };
    }
    throw e;
  }
}

/**
 * Obtiene HTML público con cabeceras cercanas a un navegador, timeout y un segundo intento
 * ante 403, 429 o timeout.
 */
export async function fetchPublicHtml(
  url: string,
  options: FetchHtmlOptions = {},
): Promise<HtmlFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const slug = options.slug ?? "(sin slug)";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const outcome = await doOneFetch(url, timeoutMs);

      if (outcome.ok) {
        return outcome.result;
      }

      if (outcome.error === "timeout") {
        if (attempt < MAX_ATTEMPTS) {
          logFetchFailure(slug, null, "timeout (reintento)", attempt);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        logFetchFailure(slug, null, "timeout (fallo definitivo)", attempt);
        throw new Error("FETCH_TIMEOUT");
      }

      if (outcome.error === "http") {
        const st = outcome.result.statusCode;
        const reason = st === 403 ? "forbidden" : st === 429 ? "rate_limited" : `http_${st}`;
        if (attempt < MAX_ATTEMPTS) {
          logFetchFailure(slug, st, `${reason} (reintento en ${RETRY_DELAY_MS}ms)`, attempt);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        logFetchFailure(slug, st, `${reason} (fallo definitivo)`, attempt);
        return outcome.result;
      }
    } catch (e) {
      if (e instanceof Error && e.message === "FETCH_TIMEOUT") {
        throw e;
      }
      if (attempt < MAX_ATTEMPTS) {
        logFetchFailure(
          slug,
          null,
          e instanceof Error ? `network: ${e.message} (reintento)` : "network_error (reintento)",
          attempt,
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      logFetchFailure(
        slug,
        null,
        e instanceof Error ? `network: ${e.message} (fallo definitivo)` : "network_error (fallo definitivo)",
        attempt,
      );
      throw e;
    }
  }

  throw new Error("FETCH_EMPTY");
}
