import type { APIRoute } from "astro";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const prerender = false;

const LIKES_FILE = "/tmp/pch-likes.json";

function readLikes(): number {
  try {
    if (existsSync(LIKES_FILE)) {
      const data = JSON.parse(readFileSync(LIKES_FILE, "utf-8")) as { likes?: unknown };
      const n = Number(data.likes);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function writeLikes(n: number): void {
  try {
    writeFileSync(LIKES_FILE, JSON.stringify({ likes: n }), "utf-8");
  } catch (err) {
    console.error("[likes] Write error:", err);
  }
}

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

export const GET: APIRoute = async () => {
  const likes = readLikes();
  return new Response(JSON.stringify({ likes }), { headers });
};

export const POST: APIRoute = async () => {
  const current = readLikes();
  const newCount = current + 1;
  writeLikes(newCount);
  return new Response(JSON.stringify({ likes: newCount }), { headers });
};
