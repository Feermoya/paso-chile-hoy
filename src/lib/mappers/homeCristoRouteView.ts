import type { RouteSegmentItem, RouteSegmentsPayload } from "@/types/route-segments";

/** Marca visual en el eje del recorrido. */
export type TimelineVisualMark = "check" | "check-dim" | "warn" | "stop" | "dot";

export interface HomeCristoRouteTimelineRow extends RouteSegmentItem {
  isBlocking: boolean;
  isAfterBlocking: boolean;
  isCriticalFinal: boolean;
  visualMark: TimelineVisualMark;
  badgeLabel: string;
  badgeLabelMobile: string;
  badgeLabelStrong: string;
  kmDisplay: string | null;
  surfaceLine: string | null;
}

export type FreshnessDot = "green" | "amber" | "red";

export type HomeCristoDisplayItem =
  | { kind: "segment"; row: HomeCristoRouteTimelineRow }
  | { kind: "collapsed"; count: number };

export type MainAlertTone = "ok" | "warn" | "danger" | "neutral";

export interface HomeCristoRouteView {
  title: string;
  updatedAtIso: string;
  freshnessDot: FreshnessDot;
  freshnessLabel: string;
  enabledSummary: string;
  /** Banner fino sobre la timeline (corte total / alerta). */
  showAlertBanner: boolean;
  alertBannerText: string;
  mainAlertMessage: string;
  mainAlertTone: MainAlertTone;
  headline: string;
  reachLine: string;
  /** Caja "¿Hasta dónde…?" — fila verde (siempre). */
  reachGreenLine: string;
  reachGreenLineShort: string;
  /** Fila roja; null si no hay corte. */
  reachRedLine: string | null;
  reachRedLineShort: string | null;
  timeline: HomeCristoRouteTimelineRow[];
  mobileTimeline: HomeCristoDisplayItem[];
}

function isBlockingStatus(status: RouteSegmentItem["status"]): boolean {
  return status === "PARTIAL" || status === "CLOSED";
}

function tailPlace(name: string): string {
  const parts = name.split(/\s*-\s*/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : name.trim();
}

function badgeLabelFor(status: RouteSegmentItem["status"]): string {
  switch (status) {
    case "OPEN":
      return "Habilitada";
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

function badgeMobileFor(status: RouteSegmentItem["status"], strong?: string): string {
  if (status === "OPEN") return "OK";
  if (status === "CLOSED") {
    const u = strong?.toUpperCase() ?? "";
    if (u.includes("CORTE TOTAL")) return "Corte";
    return "Corte";
  }
  if (status === "CAUTION") return "Precaución";
  if (status === "PARTIAL") return "Parcial";
  return "—";
}

function formatKm(km: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  const s = Number.isInteger(km)
    ? String(km)
    : km.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `${s} km`;
}

function surfaceLine(surface: string | null, km: string | null): string | null {
  const s = surface?.trim();
  if (s && km) return `${s} · ${km}`;
  if (s) return s;
  if (km) return km;
  return null;
}

function firstBlockingIndex(segments: RouteSegmentItem[]): number {
  return segments.findIndex((s) => isBlockingStatus(s.status));
}

function firstClosedIndex(segments: RouteSegmentItem[]): number {
  return segments.findIndex((s) => s.status === "CLOSED");
}

function countOpen(segments: RouteSegmentItem[]): number {
  return segments.filter((s) => s.status === "OPEN").length;
}

/** Alerta superior: hay corte total (segmento cerrado en datos). */
function hasCorteTotal(segments: RouteSegmentItem[]): boolean {
  return segments.some((s) => s.status === "CLOSED");
}

function visualMarkFor(
  status: RouteSegmentItem["status"],
  isAfterBlocking: boolean,
): TimelineVisualMark {
  if (status === "OPEN") return isAfterBlocking ? "check-dim" : "check";
  if (status === "CLOSED") return "stop";
  if (status === "PARTIAL" || status === "CAUTION") return "warn";
  return "dot";
}

function buildFreshness(iso: string): { dot: FreshnessDot; label: string } {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) {
    return { dot: "amber", label: "Sin fecha de actualización clara" };
  }
  const ageMin = Math.max(0, (Date.now() - t) / 60000);
  if (ageMin > 120) {
    const h = Math.floor(ageMin / 60);
    return {
      dot: "red",
      label: `Datos desactualizados · hace ${h} ${h === 1 ? "hora" : "horas"}`,
    };
  }
  if (ageMin > 30) {
    return { dot: "amber", label: `Actualizado hace ${Math.max(1, Math.floor(ageMin))} min` };
  }
  if (ageMin < 1) {
    return { dot: "green", label: "Actualizado hace un momento" };
  }
  return { dot: "green", label: `Actualizado hace ${Math.floor(ageMin)} min` };
}

/** Último tramo abierto alcanzable antes del primer cierre / precaución relevante. */
function lastReachablePlace(payload: RouteSegmentsPayload): {
  line: string;
  short: string;
  noEnabled: boolean;
} {
  const segs = payload.segments;
  if (!segs.some((s) => s.status === "OPEN")) {
    return {
      line: "Sin tramos habilitados",
      short: "Sin tramos habilitados",
      noEnabled: true,
    };
  }
  const ci = firstClosedIndex(segs);
  let end = ci === -1 ? segs.length : ci;
  const pi = segs.findIndex((s) => s.status === "PARTIAL" || s.status === "CAUTION");
  if (pi >= 0 && (ci === -1 || pi < ci)) {
    end = pi;
  }
  let last = -1;
  for (let i = 0; i < end; i++) {
    if (segs[i].status === "OPEN") {
      last = i;
    }
  }
  if (last < 0) {
    return {
      line: "Consultá restricciones en el recorrido",
      short: "Consultá el recorrido",
      noEnabled: false,
    };
  }
  const t = tailPlace(segs[last].name);
  return {
    line: `Podés llegar hasta ${t}`,
    short: `Llegás hasta ${t}`,
    noEnabled: false,
  };
}

function cutSegmentName(payload: RouteSegmentsPayload): string | null {
  const ci = firstClosedIndex(payload.segments);
  if (ci < 0) return null;
  return payload.segments[ci].name.trim();
}

function cutPlaceShort(payload: RouteSegmentsPayload): string | null {
  const n = cutSegmentName(payload);
  return n ? tailPlace(n) : null;
}

function buildMainAlert(
  payload: RouteSegmentsPayload,
  bi: number,
): { message: string; tone: MainAlertTone } {
  const { summary, segments } = payload;
  const tunnel = segments.find((s) => s.flags.international);

  if (summary.canReachPass === true) {
    return {
      message: "La ruta se encuentra habilitada en los tramos relevados.",
      tone: "ok",
    };
  }

  if (summary.canReachPass === false) {
    if (tunnel?.status === "CLOSED") {
      return {
        message: "El tránsito está interrumpido en el Túnel Internacional.",
        tone: "danger",
      };
    }
    if (bi >= 0) {
      const name = segments[bi].name.trim();
      return {
        message: `El tránsito está interrumpido en ${name}.`,
        tone: "danger",
      };
    }
  }

  if (bi >= 0 && segments[bi].status === "PARTIAL") {
    return {
      message: `Hay restricciones de circulación en ${segments[bi].name.trim()}.`,
      tone: "warn",
    };
  }

  return {
    message: "Hay tramos con precaución o datos incompletos; revisá el detalle antes de viajar.",
    tone: "warn",
  };
}

function buildReachLineLegacy(payload: RouteSegmentsPayload): string {
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

function buildMobileTimeline(rows: HomeCristoRouteTimelineRow[]): HomeCristoDisplayItem[] {
  const items: HomeCristoDisplayItem[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].status !== "OPEN") {
      items.push({ kind: "segment", row: rows[i] });
      i++;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].status === "OPEN") {
      j++;
    }
    const runLen = j - i;
    if (runLen < 4) {
      for (let k = i; k < j; k++) {
        items.push({ kind: "segment", row: rows[k] });
      }
      i = j;
      continue;
    }
    items.push({ kind: "segment", row: rows[i] });
    items.push({ kind: "collapsed", count: runLen - 2 });
    items.push({ kind: "segment", row: rows[j - 1] });
    i = j;
  }
  return items;
}

export function buildHomeCristoRouteView(payload: RouteSegmentsPayload): HomeCristoRouteView {
  const iso = payload.sourceUpdatedAt?.trim() || payload.updatedAt?.trim() || "";
  const segments = payload.segments;
  const total = segments.length;
  const openN = countOpen(segments);
  const enabledSummary = `${openN} de ${total} tramos habilitados`;

  const freshness = iso ? buildFreshness(iso) : { dot: "amber" as const, label: "Sin marca de tiempo" };

  const bi = firstBlockingIndex(segments);
  const { message: mainAlertMessage, tone: mainAlertTone } = buildMainAlert(payload, bi);

  const showAlertBanner = hasCorteTotal(segments);

  const reach = lastReachablePlace(payload);
  const reachGreenLine = reach.line;
  const reachGreenLineShort = reach.short;

  const cutName = cutSegmentName(payload);
  const cutShort = cutPlaceShort(payload);
  const reachRedLine =
    cutName != null ? `No podés cruzar por ${cutName}` : null;
  const reachRedLineShort =
    cutShort != null ? `No cruzás el ${cutShort}` : null;

  const alertBannerText = showAlertBanner ? mainAlertMessage : "";

  const timeline: HomeCristoRouteTimelineRow[] = segments.map((s, index) => {
    const isBlocking = bi >= 0 && index === bi;
    const isAfterBlocking = bi >= 0 && index > bi;
    const isCriticalFinal =
      isBlocking && (s.flags.international || s.status === "CLOSED" || s.status === "PARTIAL");
    const kmD = formatKm(s.lengthKm);
    const strong = s.statusLabel?.trim();
    return {
      ...s,
      isBlocking,
      isAfterBlocking,
      isCriticalFinal,
      visualMark: visualMarkFor(s.status, isAfterBlocking),
      badgeLabel: badgeLabelFor(s.status),
      badgeLabelMobile: badgeMobileFor(s.status, strong),
      badgeLabelStrong: strong || badgeLabelFor(s.status).toUpperCase(),
      kmDisplay: kmD,
      surfaceLine: surfaceLine(s.surface, kmD),
    };
  });

  const mobileTimeline = buildMobileTimeline(timeline);

  return {
    title: "Estado de la ruta RN 7 hacia Cristo Redentor",
    updatedAtIso: iso || new Date().toISOString(),
    freshnessDot: freshness.dot,
    freshnessLabel: freshness.label,
    enabledSummary,
    showAlertBanner,
    alertBannerText,
    mainAlertMessage,
    mainAlertTone,
    headline: payload.summary.headline,
    reachLine: buildReachLineLegacy(payload),
    reachGreenLine,
    reachGreenLineShort,
    reachRedLine,
    reachRedLineShort,
    timeline,
    mobileTimeline,
  };
}
