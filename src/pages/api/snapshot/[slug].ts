import type { APIRoute } from "astro";
import { getPasoBySlug } from "@/data/pasos";
import { mapPersistedSnapshotToView } from "@/lib/mappers/passViewMapper";
import { getSnapshotForApi, refreshAndPersistSnapshot } from "@/lib/server/services/snapshotService";
import type { PassSnapshot } from "@/lib/server/passMapper";
import type { PassRaw } from "@/types/pass-raw";
import { formatRelativeTimeAgo } from "@/utils/formatRelativeTime";
import { heroScheduleFromView } from "@/utils/heroScheduleFromView";
import { inferPassStatus } from "@/utils/inferPassStatus";
import type { PassDisplayStatus } from "@/utils/inferPassStatus";

export const prerender = false;

const STATUS_LABELS: Record<PassDisplayStatus, string> = {
  abierto: "ABIERTO",
  condicionado: "CONDICIONADO",
  cerrado: "CERRADO",
  sin_datos: "Estado no disponible",
};

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

function buildPayload(raw: PassRaw | PassSnapshot, paso: NonNullable<ReturnType<typeof getPasoBySlug>>) {
  const view = mapPersistedSnapshotToView(raw, paso);
  const st = inferPassStatus(view);
  const scrapedAt = raw.scrapedAt ?? "";
  return {
    passRaw: raw,
    scrapedAt,
    lastUpdatedRelative: scrapedAt ? formatRelativeTimeAgo(scrapedAt) : "",
    status: st.status,
    statusLabel: STATUS_LABELS[st.status],
    schedule: heroScheduleFromView(view),
    opensInMinutes: st.opensInMinutes ?? null,
    closesInMinutes: st.closesInMinutes ?? null,
  };
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
    return new Response(JSON.stringify(buildPayload(raw, paso)), { status: 200, headers: jsonHeaders() });
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
    return new Response(JSON.stringify(buildPayload(raw, paso)), { status: 200, headers: jsonHeaders() });
  } catch {
    return new Response(JSON.stringify({ error: "Refresh failed" }), { status: 503, headers: jsonHeaders() });
  }
};
