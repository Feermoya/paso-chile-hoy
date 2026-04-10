import { snapshotFreshMs } from "@/lib/server/config/snapshotPolicy";
import { getPassConfigBySlug } from "@/lib/server/config/passes";
import { parseArgentinaPassHtml } from "@/lib/server/parsers/argentinaPassParser";
import { fetchPublicHtml } from "@/lib/server/sources/argentinaPassHtmlSource";
import {
  readPassSnapshotFile,
  writePassSnapshotFile,
} from "@/lib/server/storage/jsonSnapshotStore";
import type { PassRaw } from "@/types/pass-raw";

/** Solo entorno local (no build ni runtime en Vercel). */
function isDevRuntime(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

/** En Vercel (build y runtime) no se hace scraping: solo JSON en repo / GitHub Actions. */
function isVercelEnv(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

/** Scrape en vivo solo en local, sin `VERCEL`. */
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

function isFresh(snapshot: PassRaw, maxAgeMs: number): boolean {
  const at = snapshot.scrapedAt?.trim();
  if (!at) return false;
  return snapshotAgeMs(at) < maxAgeMs;
}

/** Lee el último snapshot persistido (JSON en `public/snapshots`). */
export async function readPersistedSnapshot(slug: string): Promise<PassRaw | null> {
  return readPassSnapshotFile(slug);
}

async function tryWriteSnapshot(slug: string, snapshot: PassRaw): Promise<void> {
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
 * Obtiene HTML público, parsea y persiste cuando el filesystem es escribible (local / CI).
 */
export async function refreshAndPersistSnapshot(slug: string): Promise<PassRaw> {
  const cfg = getPassConfigBySlug(slug);
  if (!cfg) {
    throw new Error("UNKNOWN_SLUG");
  }

  const { html, statusCode, finalUrl } = await fetchPublicHtml(cfg.sourceUrl, { slug });
  if (statusCode >= 400) {
    throw new Error(`HTTP_${statusCode}`);
  }

  const scrapedAt = new Date().toISOString();
  const snapshot = parseArgentinaPassHtml(html, {
    slug,
    sourceUrl: finalUrl || cfg.sourceUrl,
    scrapedAt,
  });

  await tryWriteSnapshot(slug, snapshot);
  return snapshot;
}

/**
 * Producción / Vercel: solo lee `public/snapshots/{slug}.json`.
 * Desarrollo local: puede scrapear si falta el archivo o está vencido.
 */
export async function getSnapshotForApi(slug: string): Promise<PassRaw> {
  const cfg = getPassConfigBySlug(slug);
  if (!cfg) {
    throw new Error("UNKNOWN_SLUG");
  }

  const persisted = await readPassSnapshotFile(slug);

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
    return persisted;
  }

  throw new Error("SNAPSHOT_MISSING");
}
