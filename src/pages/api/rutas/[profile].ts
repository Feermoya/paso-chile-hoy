import type { APIRoute } from "astro";

import { fetchNationalRouteRows } from "@/lib/server/route-segments/fetchNationalRaw";
import { buildRouteSegmentsPayload } from "@/lib/server/route-segments/mapRawToPayload";
import { getRouteProfile } from "@/lib/server/route-segments/profiles";
import {
  readRouteSegments,
  writeRouteSegments,
} from "@/lib/server/storage/routeSegmentsStorage";

export const prerender = false;

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

function verifyRefreshAuth(request: Request): boolean {
  const secret = process.env.SCRAPE_SECRET?.trim();
  if (!secret) return true;
  return request.headers.get("x-scrape-secret") === secret;
}

export const GET: APIRoute = async ({ params }) => {
  const profile = params.profile ?? "";
  if (!profile) {
    return new Response(JSON.stringify({ error: "Missing profile" }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const cfg = getRouteProfile(profile);
  if (!cfg) {
    return new Response(JSON.stringify({ error: "Unknown profile" }), {
      status: 404,
      headers: jsonHeaders(),
    });
  }

  const payload = await readRouteSegments(profile);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Snapshot not found" }), {
      status: 404,
      headers: jsonHeaders(),
    });
  }

  return new Response(JSON.stringify(payload), { status: 200, headers: jsonHeaders() });
};

/**
 * Refresco puntual: fetch Sheets + filtrado + persistencia en Redis (y disco fuera de Vercel).
 * Útil entre deploys cuando KV está configurado.
 */
export const POST: APIRoute = async ({ params, request }) => {
  if (!verifyRefreshAuth(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: jsonHeaders(),
    });
  }

  const profile = params.profile ?? "";
  if (!profile) {
    return new Response(JSON.stringify({ error: "Missing profile" }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const cfg = getRouteProfile(profile);
  if (!cfg) {
    return new Response(JSON.stringify({ error: "Unknown profile" }), {
      status: 404,
      headers: jsonHeaders(),
    });
  }

  try {
    const allRows = await fetchNationalRouteRows();
    const generatedAtIso = new Date().toISOString();
    const payload = buildRouteSegmentsPayload(allRows, cfg, generatedAtIso);
    await writeRouteSegments(profile, payload);
    return new Response(JSON.stringify(payload), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    console.error(`[api/rutas] POST refresh failed for "${profile}":`, err);
    return new Response(JSON.stringify({ error: "Refresh failed" }), {
      status: 503,
      headers: jsonHeaders(),
    });
  }
};
