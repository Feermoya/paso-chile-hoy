import type { APIRoute } from "astro";
import { getRedis } from "@/lib/server/redisClient";

export const prerender = false;

const KEY = "pch:likes";

/** Valor inicial en Redis si la clave no existe (luego solo suma con INCR). */
const INITIAL_LIKES = 6;

async function ensureBaseline(client: NonNullable<ReturnType<typeof getRedis>>): Promise<void> {
  await client.set(KEY, INITIAL_LIKES, { nx: true });
}

export const GET: APIRoute = async () => {
  const client = getRedis();
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
  const client = getRedis();
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
