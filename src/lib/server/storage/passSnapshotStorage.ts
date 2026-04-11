import { getRedis } from "@/lib/server/redisClient";
import type { PassSnapshot } from "@/lib/server/passMapper";
import {
  parsePassSnapshotJson,
  readPassSnapshotFile,
  writePassSnapshotFile,
} from "@/lib/server/storage/jsonSnapshotStore";
import type { PassRaw } from "@/types/pass-raw";

const REDIS_KEY_PREFIX = "pch:pass-snapshot:v1:";

function redisKey(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (safe !== slug || !safe) throw new Error("INVALID_SLUG_FOR_STORAGE");
  return `${REDIS_KEY_PREFIX}${safe}`;
}

function isVercelRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

/**
 * Fuente unificada: Upstash (si hay credenciales) + fallback a `public/snapshots/{slug}.json`.
 * En producción, tras un refresh, el valor vigente vive en Redis; el archivo del deploy es solo bootstrap.
 */
export async function readPassSnapshot(slug: string): Promise<PassRaw | PassSnapshot | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(redisKey(slug));
      if (typeof raw === "string" && raw.length > 2) {
        const snap = parsePassSnapshotJson(JSON.parse(raw) as unknown);
        if (snap) return snap;
      }
    } catch (e) {
      console.warn("[pass-snapshot] Redis GET failed, usando archivo:", slug, e);
    }
  }
  return readPassSnapshotFile(slug);
}

/**
 * Escribe en Redis cuando está configurado (obligatorio en Vercel).
 * Fuera de Vercel también escribe el JSON en disco (CI, desarrollo, commits).
 */
export async function writePassSnapshot(slug: string, snapshot: PassRaw | PassSnapshot): Promise<void> {
  if (snapshot.slug !== slug) {
    throw new Error("SNAPSHOT_SLUG_MISMATCH");
  }

  const redis = getRedis();
  const onVercel = isVercelRuntime();

  if (redis) {
    try {
      await redis.set(redisKey(slug), JSON.stringify(snapshot));
    } catch (e) {
      console.error("[pass-snapshot] Redis SET failed:", slug, e);
      throw e;
    }
  } else if (onVercel) {
    const msg =
      "[pass-snapshot] En Vercel hace falta KV_REST_API_URL + KV_REST_API_TOKEN (Upstash) para persistir snapshots.";
    console.error(msg);
    throw new Error("SNAPSHOT_PERSIST_REDIS_REQUIRED");
  }

  if (!onVercel) {
    await writePassSnapshotFile(slug, snapshot);
  }
}

/** Alias explícito para el flujo de refresh. */
export const persistPassSnapshot = writePassSnapshot;
