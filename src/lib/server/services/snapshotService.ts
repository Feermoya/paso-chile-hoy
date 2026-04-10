import { getPasoBySlug } from "@/data/pasos";
import { snapshotFreshMs } from "@/lib/server/config/snapshotPolicy";
import { fetchConsolidado, fetchClima, fetchDetailHTML } from "@/lib/server/apiClient";
import { parseForecastFromHTML } from "@/lib/server/forecastParser";
import { mapToSnapshot, type PassSnapshot } from "@/lib/server/passMapper";
import { getLatestPassTweet } from "@/utils/twitterScraper";
import { checkSnapshotFreshness } from "@/lib/server/utils/snapshotFreshnessCheck";
import {
  readPassSnapshotFile,
  writePassSnapshotFile,
} from "@/lib/server/storage/jsonSnapshotStore";
import type { PassRaw } from "@/types/pass-raw";

/** En producción, si el JSON tiene más de esto, se intenta refrescar desde la API. */
const SNAPSHOT_STALE_MAX_MINUTES = 120;

/** Error interno cuando no hay snapshot persistido y el scrape en vivo también falla (no mostrar al usuario). */
export const PASS_DATA_UNAVAILABLE = "PASS_DATA_UNAVAILABLE";

/** Solo entorno local (no build ni runtime en Vercel). */
function isDevRuntime(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function isVercelEnv(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

function allowLiveScrape(): boolean {
  return isDevRuntime() && !isVercelEnv();
}

function isVercelRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

function snapshotAgeMs(scrapedAt: string): number {
  const t = new Date(scrapedAt).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

function isFresh(snapshot: PassRaw | PassSnapshot, maxAgeMs: number): boolean {
  const at = snapshot.scrapedAt?.trim();
  if (!at) return false;
  return snapshotAgeMs(at) < maxAgeMs;
}

/** Lee el último snapshot persistido (JSON en `public/snapshots`). */
export async function readPersistedSnapshot(slug: string): Promise<PassRaw | PassSnapshot | null> {
  return readPassSnapshotFile(slug);
}

async function tryWriteSnapshot(slug: string, snapshot: PassRaw | PassSnapshot): Promise<void> {
  try {
    await writePassSnapshotFile(slug, snapshot);
  } catch (e) {
    if (isVercelRuntime()) {
      return;
    }
    throw e;
  }
}

/**
 * Obtiene datos del API oficial y persiste cuando el filesystem es escribible (local / CI).
 */
export async function refreshAndPersistSnapshot(slug: string): Promise<PassSnapshot> {
  const cfg = getPasoBySlug(slug);
  if (!cfg?.active) {
    throw new Error("UNKNOWN_SLUG");
  }

  const [consolidado, clima, htmlDetail] = await Promise.all([
    fetchConsolidado(cfg.routeId),
    fetchClima(String(cfg.lat), String(cfg.lng)),
    fetchDetailHTML(cfg.routeId, cfg.routeSlug),
  ]);

  const forecast = parseForecastFromHTML(htmlDetail);
  const snapshot = mapToSnapshot(cfg, consolidado, clima, forecast);

  try {
    const latestTweet = await getLatestPassTweet(slug);
    snapshot.latestTweet = latestTweet;
  } catch (e) {
    console.warn(`[snapshot] latestTweet for ${slug}:`, e);
    snapshot.latestTweet = null;
  }

  await tryWriteSnapshot(slug, snapshot);
  return snapshot;
}

/**
 * Producción / Vercel: solo lee `public/snapshots/{slug}.json`.
 * Desarrollo local: puede refrescar desde el API si falta el archivo o está vencido.
 */
export async function getSnapshotForApi(slug: string): Promise<PassRaw | PassSnapshot> {
  const cfg = getPasoBySlug(slug);
  if (!cfg?.active) {
    throw new Error("UNKNOWN_SLUG");
  }

  const persisted = await readPassSnapshotFile(slug);

  if (persisted) {
    checkSnapshotFreshness(persisted);
  }

  if (allowLiveScrape()) {
    if (!persisted) {
      return refreshAndPersistSnapshot(slug);
    }
    if (!isFresh(persisted, snapshotFreshMs)) {
      try {
        return await refreshAndPersistSnapshot(slug);
      } catch {
        return persisted;
      }
    }
    return persisted;
  }

  if (persisted) {
    const at = persisted.scrapedAt?.trim();
    if (at) {
      const ageMin = snapshotAgeMs(at) / 60000;
      if (ageMin > SNAPSHOT_STALE_MAX_MINUTES) {
        console.warn(
          `[snapshot] ${slug} tiene ${Math.round(ageMin)} min — intentando live scrape`,
        );
        try {
          return await refreshAndPersistSnapshot(slug);
        } catch (e) {
          console.error(`[snapshot] Live scrape falló para ${slug}:`, e);
          return persisted;
        }
      }
    }
    return persisted;
  }

  console.warn(
    `[snapshot] No persisted snapshot for "${slug}" (missing from deploy or repo); attempting live scrape...`,
  );
  try {
    return await refreshAndPersistSnapshot(slug);
  } catch (e) {
    console.error(`[snapshot] Live scrape failed for "${slug}":`, e);
    throw new Error(PASS_DATA_UNAVAILABLE);
  }
}
