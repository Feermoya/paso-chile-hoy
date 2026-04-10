import type { APIRoute } from "astro";

import { mapPassRawToView } from "@/lib/mappers/passViewMapper";
import { getPassConfigBySlug } from "@/lib/server/config/passes";
import { getSnapshotForApi } from "@/lib/server/services/snapshotService";
import { logPassPipelineDebug } from "@/lib/server/utils/passDebugLog";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  if (!slug || !getPassConfigBySlug(slug)) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const raw = await getSnapshotForApi(slug);
    const view = mapPassRawToView(raw);
    logPassPipelineDebug(`GET /api/pass/${slug}`, { raw, view });

    return new Response(JSON.stringify(view), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "service_unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
};
