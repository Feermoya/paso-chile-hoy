import type { APIRoute } from "astro";
import { getPasoBySlug } from "@/data/pasos";
import {
  buildPassSnapshotApiEnvelope,
  type PassSnapshotApiEnvelope,
} from "@/lib/server/passRefreshPayload";
import {
  getSnapshotForApi,
  readPersistedSnapshot,
  refreshAndPersistSnapshot,
} from "@/lib/server/services/snapshotService";

export const prerender = false;

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

const STALE_REFRESH_MESSAGE =
  "No se pudo refrescar ahora; mostrando el último dato disponible.";

function envelope(
  raw: Parameters<typeof buildPassSnapshotApiEnvelope>[0],
  paso: NonNullable<ReturnType<typeof getPasoBySlug>>,
  flags: Pick<PassSnapshotApiEnvelope, "stale" | "refreshFailed"> & { message?: string },
): PassSnapshotApiEnvelope {
  return buildPassSnapshotApiEnvelope(raw, paso, flags);
}

function jsonBody(body: PassSnapshotApiEnvelope | Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}

function verifyRefreshAuth(request: Request): boolean {
  const secret = process.env.SCRAPE_SECRET?.trim();
  if (!secret) return true;
  return request.headers.get("x-scrape-secret") === secret;
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400, headers: jsonHeaders() });
  }

  const paso = getPasoBySlug(slug);
  if (!paso?.active) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders() });
  }

  try {
    const raw = await getSnapshotForApi(slug);
    return new Response(
      JSON.stringify(
        envelope(raw, paso, { stale: false, refreshFailed: false }),
      ),
      { status: 200, headers: jsonHeaders() },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Snapshot failed" }), { status: 503, headers: jsonHeaders() });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  if (!verifyRefreshAuth(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders() });
  }

  const slug = params.slug ?? "";
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400, headers: jsonHeaders() });
  }

  const paso = getPasoBySlug(slug);
  if (!paso?.active) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders() });
  }

  try {
    const raw = await refreshAndPersistSnapshot(slug);
    return jsonBody(envelope(raw, paso, { stale: false, refreshFailed: false }), 200);
  } catch (err) {
    console.error(`[snapshot-api] POST refresh failed for "${slug}":`, err);
    const persisted = await readPersistedSnapshot(slug);
    if (persisted) {
      return jsonBody(
        envelope(persisted, paso, {
          stale: true,
          refreshFailed: true,
          message: STALE_REFRESH_MESSAGE,
        }),
        200,
      );
    }
    return jsonBody(
      {
        error: "Refresh failed",
        refreshFailed: true,
        stale: false,
        message: STALE_REFRESH_MESSAGE,
      },
      503,
    );
  }
};
