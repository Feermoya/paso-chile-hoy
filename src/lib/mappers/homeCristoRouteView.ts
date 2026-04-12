import type { RouteSegmentItem, RouteSegmentsPayload } from "@/types/route-segments";

export interface HomeCristoRouteTimelineRow extends RouteSegmentItem {
  isBlocking: boolean;
  isAfterBlocking: boolean;
  showNotes: boolean;
  badgeLabel: string;
  kmDisplay: string | null;
}

export interface HomeCristoRouteView {
  title: string;
  eyebrow: string;
  updatedLine: string;
  headline: string;
  reachLine: string;
  timeline: HomeCristoRouteTimelineRow[];
}

function isBlockingStatus(status: RouteSegmentItem["status"]): boolean {
  return status === "PARTIAL" || status === "CLOSED";
}

/** Último tramo “alcanzable” legible (ej. “Las Cuevas” desde “Puente Del Inca - Las Cuevas”). */
function tailPlace(name: string): string {
  const parts = name.split(/\s*-\s*/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : name.trim();
}

function badgeLabelFor(status: RouteSegmentItem["status"]): string {
  switch (status) {
    case "OPEN":
      return "Habilitado";
    case "PARTIAL":
      return "Parcial";
    case "CLOSED":
      return "Cerrado";
    case "CAUTION":
      return "Precaución";
    default:
      return "Sin dato";
  }
}

function formatKm(km: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  const s = Number.isInteger(km)
    ? String(km)
    : km.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `${s} km`;
}

function firstBlockingIndex(segments: RouteSegmentItem[]): number {
  return segments.findIndex((s) => isBlockingStatus(s.status));
}

function buildReachLine(payload: RouteSegmentsPayload): string {
  const { summary, segments } = payload;
  const bi = firstBlockingIndex(segments);
  const tunnel = segments.find((s) => s.flags.international);

  if (summary.canReachPass === true) {
    return "Podés circular con normalidad en todo el recorrido relevado.";
  }

  if (summary.canReachPass === false) {
    if (tunnel?.status === "CLOSED") {
      return "No se puede cruzar por el Túnel Internacional.";
    }
    if (bi > 0) {
      return `Podés circular hasta ${tailPlace(segments[bi - 1].name)}.`;
    }
    return "Hay restricciones desde el inicio del recorrido.";
  }

  if (bi >= 0 && segments[bi].status === "PARTIAL") {
    return "Hay cortes o trabajos parciales en ruta; revisá antes de salir.";
  }

  return "Hay tramos con precaución; revisá el estado antes de viajar.";
}

/**
 * Vista derivada para la sección home (RN 7 → Cristo Redentor).
 * `formatRelative` recibe ISO y devuelve texto tipo "hace 2 h".
 */
export function buildHomeCristoRouteView(
  payload: RouteSegmentsPayload,
  formatRelative: (iso: string) => string,
): HomeCristoRouteView {
  const iso = payload.sourceUpdatedAt?.trim() || payload.updatedAt?.trim() || "";
  const rel = iso ? formatRelative(iso) : "";
  const updatedLine = rel ? `Datos de Vialidad · actualizado ${rel}` : "Datos de Vialidad Nacional";

  const bi = firstBlockingIndex(payload.segments);
  const timeline: HomeCristoRouteTimelineRow[] = payload.segments.map((s, index) => {
    const isBlocking = bi >= 0 && index === bi;
    const isAfterBlocking = bi >= 0 && index > bi;
    const showNotes = Boolean(s.notes?.trim()) && (s.flags.critical || isBlocking);
    return {
      ...s,
      isBlocking,
      isAfterBlocking,
      showNotes,
      badgeLabel: badgeLabelFor(s.status),
      kmDisplay: formatKm(s.lengthKm),
    };
  });

  return {
    title: "Estado de la ruta RN 7",
    eyebrow: "Ruta hacia Cristo Redentor",
    updatedLine,
    headline: payload.summary.headline,
    reachLine: buildReachLine(payload),
    timeline,
  };
}
