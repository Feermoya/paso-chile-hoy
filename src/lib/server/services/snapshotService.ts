import { snapshotFreshMs } from "@/lib/server/config/snapshotPolicy";
import { getPassConfigBySlug } from "@/lib/server/config/passes";
import { parseArgentinaPassHtml } from "@/lib/server/parsers/argentinaPassParser";
import { fetchPublicHtml } from "@/lib/server/sources/argentinaPassHtmlSource";
import {
  readPassSnapshotFile,
  writePassSnapshotFile,
} from "@/lib/server/storage/jsonSnapshotStore";
import type { PassRaw } from "@/types/pass-raw";

function snapshotAgeMs(scrapedAt: string): number {
  const t = new Date(scrapedAt).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

function isFresh(snapshot: PassRaw): boolean {
  const at = snapshot.scrapedAt?.trim();
  if (!at) return false;
  return snapshotAgeMs(at) < snapshotFreshMs;
}

/** Lee el último JSON persistido sin red de red ni escritura. */
export async function readPersistedSnapshot(slug: string): Promise<PassRaw | null> {
  return readPassSnapshotFile(slug);
}

/**
 * Obtiene HTML público, parsea y persiste. Lanza si el slug es inválido o falla la red/parseo crítico.
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

  await writePassSnapshotFile(slug, snapshot);
  return snapshot;
}

/**
 * Resolución para la API: prioriza disco; si no hay archivo, refresca; si está vencido, intenta refrescar;
 * ante fallo de red devuelve el último JSON útil.
 */
export async function getSnapshotForApi(slug: string): Promise<PassRaw> {
  const cfg = getPassConfigBySlug(slug);
  if (!cfg) {
    throw new Error("UNKNOWN_SLUG");
  }

  const persisted = await readPassSnapshotFile(slug);

  if (!persisted) {
    return refreshAndPersistSnapshot(slug);
  }

  if (isFresh(persisted)) {
    return persisted;
  }

  try {
    return await refreshAndPersistSnapshot(slug);
  } catch {
    return persisted;
  }
}
