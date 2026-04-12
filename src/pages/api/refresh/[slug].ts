import type { APIRoute } from "astro";
import { getPasoBySlug } from "@/data/pasos";
import { buildPassSnapshotApiEnvelope } from "@/lib/server/passRefreshPayload";
import { verifyRefreshPostAuth } from "@/lib/server/refreshPostAuth";
import { refreshAndPersistSnapshot } from "@/lib/server/services/snapshotService";

export const prerender = false;

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

/**
 * Refresh estricto: solo 200 si el scrape + persistencia terminaron bien.
 * El body incluye vista + snapshot; el cliente actualiza la UI sin recargar.
 */
export const POST: APIRoute = async ({ params, request }) => {
  if (!verifyRefreshPostAuth(request)) {
    return new Response(JSON.stringify({ error: "Forbidden", refreshFailed: true }), {
      status: 403,
      headers: jsonHeaders(),
    });
  }

  const slug = params.slug ?? "";
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug", refreshFailed: true }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const paso = getPasoBySlug(slug);
  if (!paso?.active) {
    return new Response(JSON.stringify({ error: "Not found", refreshFailed: true }), {
      status: 404,
      headers: jsonHeaders(),
    });
  }

  try {
    const raw = await refreshAndPersistSnapshot(slug);
    const body = buildPassSnapshotApiEnvelope(raw, paso, {
      stale: false,
      refreshFailed: false,
    });
    return new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    console.error(`[refresh-api] POST failed for "${slug}":`, err);
    return new Response(
      JSON.stringify({
        error: "Refresh failed",
        refreshFailed: true,
        message: "No se pudo actualizar. Intentá de nuevo.",
      }),
      { status: 503, headers: jsonHeaders() },
    );
  }
};
