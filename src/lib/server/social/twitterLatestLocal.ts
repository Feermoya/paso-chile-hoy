import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getRedis } from "@/lib/server/redisClient";

/** Contenido de `twitter-latest.json` / clave Redis `pch:twitter-latest-v1`. */
export interface LocalLatestTweet {
  text: string;
  url: string;
  date: string;
}

export interface TwitterLatestFile {
  latestTweet: LocalLatestTweet | null;
  updatedAt: string;
  lastSuccessfulRefreshAt?: string;
  lastAttemptAt?: string;
}

export const TWITTER_SNAPSHOT_REDIS_KEY = "pch:twitter-latest-v1";

function filePath(): string {
  return join(process.cwd(), "public", "snapshots", "twitter-latest.json");
}

function isValidTweetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host !== "x.com" &&
      host !== "www.x.com" &&
      host !== "twitter.com" &&
      host !== "www.twitter.com"
    ) {
      return false;
    }
    return /\/PasoCRMza\/status\/\d+/.test(u.pathname);
  } catch {
    return false;
  }
}

function optionalIso(s: unknown): boolean {
  if (s === undefined) return true;
  if (typeof s !== "string" || !s.trim()) return false;
  return Number.isFinite(Date.parse(s));
}

export function validateLocalLatestTweet(t: unknown): t is LocalLatestTweet {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  if (typeof o.text !== "string" || o.text.trim().length < 10) return false;
  if (typeof o.url !== "string" || !isValidTweetUrl(o.url)) return false;
  if (typeof o.date !== "string" || !o.date.trim()) return false;
  if (!Number.isFinite(Date.parse(o.date))) return false;
  return true;
}

export function validateTwitterLatestFile(raw: unknown): raw is TwitterLatestFile {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.updatedAt !== "string" || !o.updatedAt.trim()) return false;
  if (!Number.isFinite(Date.parse(o.updatedAt))) return false;
  if (!optionalIso(o.lastSuccessfulRefreshAt)) return false;
  if (!optionalIso(o.lastAttemptAt)) return false;
  if (!("latestTweet" in o)) return false;
  if (o.latestTweet === null) return true;
  return validateLocalLatestTweet(o.latestTweet);
}

function normalizeTwitterLatestFile(raw: TwitterLatestFile): TwitterLatestFile {
  return {
    latestTweet: raw.latestTweet,
    updatedAt: raw.updatedAt.trim(),
    lastSuccessfulRefreshAt: raw.lastSuccessfulRefreshAt?.trim(),
    lastAttemptAt: raw.lastAttemptAt?.trim(),
  };
}

function loadSnapshotFromFile(): TwitterLatestFile | null {
  const p = filePath();
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as unknown;
    if (!validateTwitterLatestFile(raw)) return null;
    return normalizeTwitterLatestFile(raw);
  } catch {
    return null;
  }
}

/**
 * Carga snapshot completo: Redis (si hay credenciales), si no hay datos válidos → archivo del deploy/local.
 */
export async function loadFullSnapshot(): Promise<TwitterLatestFile | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(TWITTER_SNAPSHOT_REDIS_KEY);
      if (typeof raw === "string" && raw.length > 2) {
        const j = JSON.parse(raw) as unknown;
        if (validateTwitterLatestFile(j)) return normalizeTwitterLatestFile(j);
      }
    } catch {
      /* fallback archivo */
    }
  }
  return loadSnapshotFromFile();
}

/**
 * Persiste en Redis si hay credenciales; en disco solo fuera de Vercel (filesystem de solo lectura en prod).
 * En local con Redis: escribe ambos para poder commitear `twitter-latest.json` y mantener KV alineado.
 */
export async function persistSnapshot(doc: TwitterLatestFile): Promise<boolean> {
  const normalized = normalizeTwitterLatestFile(doc);
  if (!validateTwitterLatestFile(normalized)) return false;

  let anyOk = false;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(TWITTER_SNAPSHOT_REDIS_KEY, JSON.stringify(normalized));
      anyOk = true;
    } catch (e) {
      console.error("[twitter-snapshot] Redis SET failed:", e);
    }
  }

  if (!process.env.VERCEL) {
    try {
      const p = filePath();
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, JSON.stringify(normalized, null, 2), "utf-8");
      anyOk = true;
    } catch (e) {
      console.error("[twitter-snapshot] write file failed:", e);
    }
  }

  if (process.env.VERCEL && !redis) {
    console.warn(
      "[twitter-snapshot] Vercel sin Redis/KV: no se puede persistir el snapshot en runtime.",
    );
    return false;
  }

  return anyOk;
}

/** Mismo post (por URL de status). */
export function sameTweetContent(a: LocalLatestTweet | null, b: LocalLatestTweet | null): boolean {
  if (!a?.url?.trim() || !b?.url?.trim()) return false;
  try {
    const ua = new URL(a.url);
    const ub = new URL(b.url);
    return ua.pathname === ub.pathname;
  } catch {
    return a.url.trim() === b.url.trim();
  }
}

/**
 * Para la home: snapshot remoto o archivo, sin red.
 * Prioridad Redis → archivo estático.
 */
export async function readLatestTweetForHome(): Promise<LocalLatestTweet | null> {
  const full = await loadFullSnapshot();
  if (!full?.latestTweet) return null;
  return validateLocalLatestTweet(full.latestTweet) ? full.latestTweet : null;
}
