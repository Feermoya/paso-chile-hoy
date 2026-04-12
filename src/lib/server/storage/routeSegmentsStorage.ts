import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRedis } from "@/lib/server/redisClient";
import type { RouteSegmentsPayload } from "@/types/route-segments";

const REDIS_KEY_PREFIX = "pch:route-segments:v1:";

function redisKey(profile: string): string {
  const safe = profile.replace(/[^a-z0-9-]/gi, "");
  if (safe !== profile || !safe) throw new Error("INVALID_PROFILE_FOR_ROUTE_SEGMENTS_STORAGE");
  return `${REDIS_KEY_PREFIX}${safe}`;
}

function resolveRutasSnapshotsDir(): string {
  return path.join(process.cwd(), "public", "snapshots", "rutas");
}

function pathForProfile(profile: string): string {
  const safe = profile.replace(/[^a-z0-9-]/gi, "");
  if (safe !== profile || !safe) throw new Error("INVALID_PROFILE_FOR_ROUTE_SEGMENTS_STORAGE");
  return path.join(resolveRutasSnapshotsDir(), `${safe}.json`);
}

function isVercelRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

function isRouteSegmentsPayload(o: unknown): o is RouteSegmentsPayload {
  if (!o || typeof o !== "object") return false;
  const p = o as Record<string, unknown>;
  return (
    p.schemaVersion === 1 &&
    typeof p.profile === "string" &&
    typeof p.passSlug === "string" &&
    Array.isArray(p.segments)
  );
}

export async function readRouteSegmentsFile(profile: string): Promise<RouteSegmentsPayload | null> {
  try {
    const raw = await readFile(pathForProfile(profile), "utf8");
    const data = JSON.parse(raw) as unknown;
    return isRouteSegmentsPayload(data) ? data : null;
  } catch {
    return null;
  }
}

export async function writeRouteSegmentsFile(
  profile: string,
  payload: RouteSegmentsPayload,
): Promise<void> {
  if (payload.profile !== profile) {
    throw new Error("ROUTE_SEGMENTS_PROFILE_MISMATCH");
  }
  const dir = resolveRutasSnapshotsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(pathForProfile(profile), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Redis primero; si no hay clave o Redis, archivo en `public/snapshots/rutas/`.
 */
export async function readRouteSegments(profile: string): Promise<RouteSegmentsPayload | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(redisKey(profile));
      if (typeof raw === "string" && raw.length > 2) {
        const data = JSON.parse(raw) as unknown;
        if (isRouteSegmentsPayload(data)) return data;
      }
    } catch (e) {
      console.warn("[route-segments] Redis GET failed, usando archivo:", profile, e);
    }
  }
  return readRouteSegmentsFile(profile);
}

/**
 * Escribe en Redis si está configurado. En Vercel sin Redis no hay persistencia (filesystem de solo lectura).
 * Fuera de Vercel también escribe el JSON en disco (CI / desarrollo).
 */
export async function writeRouteSegments(
  profile: string,
  payload: RouteSegmentsPayload,
): Promise<void> {
  if (payload.profile !== profile) {
    throw new Error("ROUTE_SEGMENTS_PROFILE_MISMATCH");
  }

  const redis = getRedis();
  const onVercel = isVercelRuntime();
  const body = JSON.stringify(payload);

  if (redis) {
    try {
      await redis.set(redisKey(profile), body);
    } catch (e) {
      console.error("[route-segments] Redis SET failed:", profile, e);
      throw e;
    }
  } else if (onVercel) {
    const msg =
      "[route-segments] En Vercel hace falta KV_REST_API_URL + KV_REST_API_TOKEN (Upstash) para persistir en runtime.";
    console.error(msg);
    throw new Error("ROUTE_SEGMENTS_PERSIST_REDIS_REQUIRED");
  }

  if (!onVercel) {
    await writeRouteSegmentsFile(profile, payload);
  }
}
