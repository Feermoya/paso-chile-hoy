import type {
  NationalRouteRow,
  NationalRouteRowStatus,
  RouteProfileConfig,
  RouteSegmentItem,
  RouteSegmentStatus,
  RouteSegmentsPayload,
  RouteSegmentsSummary,
} from "@/types/route-segments";
import {
  detectTollFromHtml,
  normalizeTramoKey,
  slugifySegmentId,
} from "@/lib/server/route-segments/parseNationalRows";

function mapNationalToSegmentStatus(n: NationalRouteRowStatus): RouteSegmentStatus {
  switch (n) {
    case "HABILITADA":
      return "OPEN";
    case "CORTE PARCIAL":
      return "PARTIAL";
    case "CORTE TOTAL":
      return "CLOSED";
    case "PRECAUCION":
      return "CAUTION";
    default:
      return "UNKNOWN";
  }
}

const STATUS_RANK: Record<RouteSegmentStatus, number> = {
  CLOSED: 5,
  PARTIAL: 4,
  CAUTION: 3,
  OPEN: 2,
  UNKNOWN: 1,
};

function worstOf(a: RouteSegmentStatus, b: RouteSegmentStatus): RouteSegmentStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function isInternationalTunnelName(canonicalSegmentName: string): boolean {
  const k = normalizeTramoKey(canonicalSegmentName);
  return k.includes("tunel internacional") || k.includes("túnel internacional");
}

/**
 * Resuelve filas del sheet para el perfil: provincia + ruta + tramos esperados en orden.
 * Filas extra (Mismo provincia/ruta, tramo no listado) se ignoran a propósito.
 */
export function resolveProfileRows(
  allRows: NationalRouteRow[],
  config: RouteProfileConfig,
): NationalRouteRow[] {
  const candidates = allRows.filter(
    (r) => r.province === config.province && r.routeCode === config.routeCode,
  );
  const byNorm = new Map<string, NationalRouteRow>();
  for (const r of candidates) {
    byNorm.set(normalizeTramoKey(r.tramo), r);
  }

  const ordered: NationalRouteRow[] = [];
  for (const expected of config.expectedSegments) {
    const key = normalizeTramoKey(expected);
    const hit = byNorm.get(key);
    if (!hit) {
      throw new Error(
        `[route-segments] Sin fila para tramo esperado "${expected}" (profile=${config.profile}, key="${key}")`,
      );
    }
    ordered.push(hit);
  }
  return ordered;
}

function computeSummary(segments: RouteSegmentItem[]): RouteSegmentsSummary {
  let openSegments = 0;
  let partialSegments = 0;
  let closedSegments = 0;
  let cautionSegments = 0;
  let worst: RouteSegmentStatus = "UNKNOWN";

  for (const s of segments) {
    worst = worstOf(worst, s.status);
    if (s.status === "OPEN") openSegments++;
    else if (s.status === "PARTIAL") partialSegments++;
    else if (s.status === "CLOSED") closedSegments++;
    else if (s.status === "CAUTION") cautionSegments++;
  }

  const totalSegments = segments.length;

  let firstBlockingSegmentId: string | null = null;
  for (const s of segments) {
    if (s.status === "PARTIAL" || s.status === "CLOSED") {
      firstBlockingSegmentId = s.id;
      break;
    }
  }

  let canReachPass: boolean | "unknown";
  if (closedSegments > 0) {
    canReachPass = false;
  } else if (
    partialSegments > 0 ||
    cautionSegments > 0 ||
    segments.some((s) => s.status === "UNKNOWN")
  ) {
    canReachPass = "unknown";
  } else {
    canReachPass = true;
  }

  let headline: string;
  const firstClosed = segments.find((s) => s.status === "CLOSED");
  if (firstClosed) {
    headline = `Corte en ${firstClosed.name}`;
  } else if (partialSegments > 0) {
    headline = "Restricciones en ruta hacia el paso";
  } else if (cautionSegments > 0 && openSegments + cautionSegments === totalSegments) {
    headline = "Precaución en ruta hacia el paso";
  } else if (openSegments === totalSegments && totalSegments > 0) {
    headline = "Ruta operativa hasta el paso";
  } else {
    headline = "Estado de ruta con información incompleta";
  }

  return {
    totalSegments,
    openSegments,
    partialSegments,
    closedSegments,
    cautionSegments,
    firstBlockingSegmentId,
    canReachPass,
    headline,
    worstStatus: worst,
  };
}

function buildSegmentItemsBase(
  orderedRows: NationalRouteRow[],
  expectedSegments: string[],
): RouteSegmentItem[] {
  return orderedRows.map((row, index) => {
    const canonical = expectedSegments[index] ?? row.tramo;
    const id = slugifySegmentId(canonical);
    const status = mapNationalToSegmentStatus(row.estadoNormalized);
    const international = isInternationalTunnelName(canonical);

    return {
      id,
      order: index,
      name: row.tramo.trim(),
      status,
      statusLabel: row.estadoLabel,
      surface: row.calzada,
      lengthKm: row.kmValue,
      notes: row.observaciones,
      updatedAt: row.updatedAtIso,
      flags: {
        critical: false,
        toll: detectTollFromHtml(row.conoceMasHtml),
        international,
      },
    };
  });
}

/** Primer tramo bloqueante según el orden visual final + túnel internacional siempre crítico. */
function applyCriticalFlags(segments: RouteSegmentItem[]): RouteSegmentItem[] {
  const firstBlock = segments.find((s) => s.status === "PARTIAL" || s.status === "CLOSED");
  return segments.map((s) => ({
    ...s,
    flags: {
      ...s.flags,
      critical: Boolean((firstBlock && s.id === firstBlock.id) || s.flags.international),
    },
  }));
}

function maxSourceIso(segments: RouteSegmentItem[]): string | null {
  let best: number | null = null;
  let bestIso: string | null = null;
  for (const s of segments) {
    if (!s.updatedAt) continue;
    const t = new Date(s.updatedAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (best == null || t > best) {
      best = t;
      bestIso = s.updatedAt;
    }
  }
  return bestIso;
}

/**
 * Construye el payload UI a partir de todas las filas nacionales ya parseadas.
 */
export function buildRouteSegmentsPayload(
  allRows: NationalRouteRow[],
  config: RouteProfileConfig,
  generatedAtIso: string,
): RouteSegmentsPayload {
  const ordered = resolveProfileRows(allRows, config);
  let segments = buildSegmentItemsBase(ordered, config.expectedSegments);
  if (config.segmentOrder === "desc") {
    segments = [...segments].reverse().map((s, i) => ({ ...s, order: i }));
  }
  segments = applyCriticalFlags(segments);
  const summary = computeSummary(segments);

  return {
    schemaVersion: 1,
    profile: config.profile,
    passSlug: config.passSlug,
    routeName: config.routeName,
    routeCode: config.routeCode,
    province: config.province,
    updatedAt: generatedAtIso,
    sourceUpdatedAt: maxSourceIso(segments),
    summary,
    segmentOrder: config.segmentOrder,
    segments,
  };
}
