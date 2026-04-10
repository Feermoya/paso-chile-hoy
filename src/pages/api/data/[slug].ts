import type { APIRoute } from "astro";
import { getPasoBySlug } from "@/data/pasos";
import { fetchClima, fetchConsolidado } from "@/lib/server/apiClient";
import { mapToSnapshot } from "@/lib/server/passMapper";

export const prerender = false;

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

/**
 * Proxy JSON: el navegador solo ve `/api/data/{slug}`; las llamadas a la API pública
 * se hacen en el servidor (Vercel).
 */
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const paso = getPasoBySlug(slug);
  if (!paso?.active) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders() });
  }

  try {
    const [consolidado, clima] = await Promise.all([
      fetchConsolidado(paso.routeId),
      fetchClima(String(paso.lat), String(paso.lng)),
    ]);
    const snapshot = mapToSnapshot(paso, consolidado, clima);
    return new Response(JSON.stringify(snapshot), { status: 200, headers: jsonHeaders() });
  } catch (e) {
    console.error(`[api/data] upstream error for ${slug}:`, e);
    return new Response(JSON.stringify({ error: "Upstream error" }), { status: 503, headers: jsonHeaders() });
  }
};
