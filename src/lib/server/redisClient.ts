import { Redis } from "@upstash/redis";

/**
 * Misma resolución que `Redis.fromEnv()`, sin instanciar si faltan credenciales
 * (evita timeouts en local sin `.env`).
 */
export function getRedisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

let cached: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (cached === undefined) {
    const env = getRedisEnv();
    cached = env ? new Redis({ url: env.url, token: env.token }) : null;
  }
  return cached;
}
