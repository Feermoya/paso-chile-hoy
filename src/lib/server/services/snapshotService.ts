import { snapshotFreshMs } from "@/lib/server/config/snapshotPolicy";
import { getPassConfigBySlug } from "@/lib/server/config/passes";
import { parseArgentinaPassHtml } from "@/lib/server/parsers/argentinaPassParser";
import { fetchPublicHtml } from "@/lib/server/sources/argentinaPassHtmlSource";
import {
  readPassSnapshotFile,
  writePassSnapshotFile,
} from "@/lib/server/storage/jsonSnapshotStore";
import type { PassRaw } from "@/types/pass-raw";

/** Compatible con Astro (Vite) y con scripts Node (jiti/tsx sin `import.meta`). */
function isDevRuntime(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
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
 * Producción (Vercel): solo lee `public/snapshots/{slug}.json` (actualizado por GitHub Actions).
 * Desarrollo: puede scrapear si falta el archivo o está vencido.
 */
export async function getSnapshotForApi(slug: string): Promise<PassRaw> {
  const cfg = getPassConfigBySlug(slug);
  if (!cfg) {
    throw new Error("UNKNOWN_SLUG");
  }

  const persisted = await readPassSnapshotFile(slug);

  if (isDevRuntime()) {
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
