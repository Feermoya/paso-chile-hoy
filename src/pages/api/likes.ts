import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

export const prerender = false;

const KEY = "pch:likes";

/** Valor inicial en Redis si la clave no existe (luego solo suma con INCR). */
const INITIAL_LIKES = 6;

async function ensureBaseline(client: Redis): Promise<void> {
  await client.set(KEY, INITIAL_LIKES, { nx: true });
}

/**
 * Misma resolución que `Redis.fromEnv()`, pero sin instanciar el cliente si faltan credenciales
 * (evita warnings, stack trace y timeouts en local sin `.env`).
 */
function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let cachedRedis: Redis | null | undefined;

function redis(): Redis | null {
  if (cachedRedis === undefined) {
    cachedRedis = getRedis();
  }
  return cachedRedis;
}

export const GET: APIRoute = async () => {
  const client = redis();
  if (!client) {
    return new Response(JSON.stringify({ likes: 0, error: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    await ensureBaseline(client);
    const raw = await client.get<number | string>(KEY);
    const likes =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : typeof raw === "string"
          ? Number.parseInt(raw, 10) || INITIAL_LIKES
          : INITIAL_LIKES;

    return new Response(JSON.stringify({ likes }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/likes error", error);

    return new Response(JSON.stringify({ likes: 0, error: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
};

export const POST: APIRoute = async () => {
  const client = redis();
  if (!client) {
    return new Response(JSON.stringify({ error: true }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    await ensureBaseline(client);
    const likes = await client.incr(KEY);

    return new Response(JSON.stringify({ likes }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/likes error", error);

    return new Response(JSON.stringify({ error: true }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
};
