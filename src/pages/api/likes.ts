import type { APIRoute } from "astro";
import { kv } from "@vercel/kv";

const LIKES_KEY = "paso-chile-hoy:likes";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const count = (await kv.get<number>(LIKES_KEY)) ?? 0;
    return new Response(JSON.stringify({ likes: count }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ likes: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async () => {
  try {
    const current = (await kv.get<number>(LIKES_KEY)) ?? 0;
    const newCount = current + 1;
    await kv.set(LIKES_KEY, newCount);
    return new Response(JSON.stringify({ likes: newCount }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
