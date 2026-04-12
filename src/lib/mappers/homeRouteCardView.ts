import { getPasoBySlug } from "@/data/pasos";
import type { RouteProfileConfig, RouteSegmentItem, RouteSegmentsPayload } from "@/types/route-segments";
import { normalizeTramoKey } from "@/lib/server/route-segments/parseNationalRows";

/** Marca visual en el eje del recorrido. */
export type TimelineVisualMark = "check" | "check-dim" | "warn" | "stop" | "dot";

export interface HomeRouteCardTimelineRow extends RouteSegmentItem {
  isBlocking: boolean;
  isAfterBlocking: boolean;
  isCriticalFinal: boolean;
  visualMark: TimelineVisualMark;
  badgeLabel: string;
  badgeLabelMobile: string;
  badgeLabelStrong: string;
  kmDisplay: string | null;
  surfaceLine: string | null;
  /** Partes del nombre para flecha "origen → destino". */
  nameOrigin: string;
  nameDest: string | null;
}

export type FreshnessDot = "green" | "amber" | "red";

export type HomeRouteCardDisplayItem =
  | { kind: "segment"; row: HomeRouteCardTimelineRow }
  | { kind: "collapsed"; count: number; rows: HomeRouteCardTimelineRow[] };

export type MainAlertTone = "ok" | "warn" | "danger" | "neutral";

export type HomeRouteReachMode = "all-open" | "all-closed" | "mixed";

export interface HomeRouteReachCard {
  mode: HomeRouteReachMode;
  /** Etiqueta uppercase chica; vacío en all-open. */
  yesZoneLabel: string;
  yesPlace: string;
  yesSub: string | null;
  yesZoneVariant: "success" | "neutral";
  showNoZone: boolean;
  noZoneLabel: string;
  noPlace: string;
  noSub: string | null;
}

/** Vista compacta tipo checkpoint (home). */
export interface HomeRouteReachCompact {
  yesPlace: string;
  yesDetail: string | null;
  showNo: boolean;
  noPlace: string;
  noDetail: string | null;
}

/** Resumen único “hasta dónde” al pie del recorrido (sin duplicar digest). */
export interface HomeRouteReachSummary {
  variant: "all-open" | "mixed" | "all-closed";
  /** Todo habilitado: una sola frase (perfil). */
  singleLine: string | null;
  /** Línea secundaria atenuada (ej. último tramo cuando todo OK). */
  mutedLine: string | null;
  /** Recorrido parcial: nombre del último punto alcanzable. */
  lastPlaceStrong: string | null;
  /** Ej. " · 275 km desde Mendoza" */
  kmLine: string | null;
  showNoRow: boolean;
  noCutStrong: string | null;
  noReason: string | null;
}

export interface HomeRouteProgress {
  openCount: number;
  total: number;
  /** 0–100 */
  openPct: number;
  /** Algún tramo en CLOSED → tramo rojo en la barra. */
  hasClosedSegment: boolean;
}

export interface HomeRouteCardView {
  profile: string;
  tramosBodyId: string;
  title: string;
  titleId: string;
  /** Presentación: "RN 7", provincia y nombre corto del paso (home cards). */
  cardRouteNumber: string;
  cardRouteRegion: string;
  cardRouteName: string;
  detailHref: string;
  timelineAriaLabel: string;
  timelineAriaLabelMobile: string;
  updatedAtIso: string;
  /** ISO usado para antigüedad (fuente o generación). */
  dataFreshnessIso: string;
  staleOverTwoHours: boolean;
  progress: HomeRouteProgress;
  freshnessDot: FreshnessDot;
  freshnessLabel: string;
  enabledSummary: string;
  /** Banner fino sobre la timeline (corte total / alerta). */
  showAlertBanner: boolean;
  alertBannerText: string;
  mainAlertMessage: string;
  mainAlertTone: MainAlertTone;
  headline: string;
  reachCard: HomeRouteReachCard;
  reachCompact: HomeRouteReachCompact;
  reachSummary: HomeRouteReachSummary;
  timeline: HomeRouteCardTimelineRow[];
  mobileTimeline: HomeRouteCardDisplayItem[];
}

/** Divide "A - B" en origen y destino para UI con flecha. */
export function splitSegmentName(name: string): { origin: string; dest: string | null } {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s*-\s*/);
  if (parts.length < 2) {
    return { origin: trimmed, dest: null };
  }
  const origin = parts[0]?.trim() ?? trimmed;
  const dest = parts.slice(1).join(" - ").trim();
  return { origin, dest: dest || null };
}

function isBlockingStatus(status: RouteSegmentItem["status"]): boolean {
  return status === "PARTIAL" || status === "CLOSED";
}

function isTunnelInternationalSegment(s: RouteSegmentItem): boolean {
  const k = normalizeTramoKey(s.name);
  return s.flags.international && (k.includes("tunel") || k.includes("túnel"));
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

/** Índice del último tramo OPEN alcanzable antes del primer bloqueo (cierre o precaución/partial). */
function lastReachableSegmentIndex(payload: RouteSegmentsPayload): number | null {
  const segs = payload.segments;
  if (!segs.some((s) => s.status === "OPEN")) return null;
  const ci = firstClosedIndex(segs);
  let end = ci === -1 ? segs.length : ci;
  const pi = segs.findIndex((s) => s.status === "PARTIAL" || s.status === "CAUTION");
  if (pi >= 0 && (ci === -1 || pi < ci)) {
    end = pi;
  }
  let last = -1;
  for (let i = 0; i < end; i++) {
    if (segs[i].status === "OPEN") last = i;
  }
  return last >= 0 ? last : null;
}

function cumulativeKmThrough(segments: RouteSegmentItem[], endInclusive: number): number | null {
  let sum = 0;
  let any = false;
  const n = Math.min(endInclusive, segments.length - 1);
  for (let i = 0; i <= n; i++) {
    const km = segments[i].lengthKm;
    if (km != null && Number.isFinite(km)) {
      sum += km;
      any = true;
    }
  }
  return any ? Math.round(sum) : null;
}

function buildReachCard(payload: RouteSegmentsPayload, profile: RouteProfileConfig): HomeRouteReachCard {
  const segs = payload.segments;
  const origin = profile.reachKmOriginLabel?.trim() || "el origen del recorrido";
  const allOpen = segs.length > 0 && segs.every((s) => s.status === "OPEN");
  if (allOpen) {
    const lastSeg = segs[segs.length - 1];
    const subDefault = "Todos los tramos habilitados";
    let yesSub = subDefault;
    const tpl = profile.reachAllOpenSubTemplate?.trim();
    if (tpl) {
      yesSub =
        tpl.includes("{lastSegmentName}") && lastSeg
          ? tpl.replace("{lastSegmentName}", lastSeg.name.trim())
          : tpl;
    }
    return {
      mode: "all-open",
      yesZoneLabel: "",
      yesPlace: profile.reachAllOpenPrimary?.trim() || "Podés cruzar a Chile sin restricciones",
      yesSub,
      yesZoneVariant: "success",
      showNoZone: false,
      noZoneLabel: "No podés cruzar por",
      noPlace: "",
      noSub: null,
    };
  }
  const anyOpen = segs.some((s) => s.status === "OPEN");
  if (!anyOpen) {
    return {
      mode: "all-closed",
      yesZoneLabel: "",
      yesPlace: "Sin acceso disponible",
      yesSub: null,
      yesZoneVariant: "neutral",
      showNoZone: false,
      noZoneLabel: "No podés cruzar por",
      noPlace: "",
      noSub: null,
    };
  }
  const lastIdx = lastReachableSegmentIndex(payload);
  const yesPlace =
    lastIdx != null ? tailPlace(segs[lastIdx].name) : "Consultá el recorrido";
  const km = lastIdx != null ? cumulativeKmThrough(segs, lastIdx) : null;
  const yesSub =
    lastIdx != null && km != null
      ? `Último punto accesible · ${km} km desde ${origin}`
      : lastIdx != null
        ? "Último punto accesible"
        : null;
  const ci = firstClosedIndex(segs);
  const showNo = ci >= 0;
  let noPlace = "";
  let noSub: string | null = null;
  if (showNo) {
    noPlace = tailPlace(segs[ci].name);
    noSub = segs[ci].notes?.trim() || null;
  }
  return {
    mode: "mixed",
    yesZoneLabel: "Podés llegar hasta",
    yesPlace,
    yesSub,
    yesZoneVariant: "success",
    showNoZone: showNo,
    noZoneLabel: "No podés cruzar por",
    noPlace: showNo ? noPlace : "",
    noSub: showNo ? noSub : null,
  };
}

function isStaleOverTwoHours(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return (Date.now() - t) / 60000 > 120;
}

function buildReachSummary(
  payload: RouteSegmentsPayload,
  profile: RouteProfileConfig,
  reachCard: HomeRouteReachCard,
): HomeRouteReachSummary {
  const segs = payload.segments;
  const origin = profile.reachKmOriginLabel?.trim() || "el origen del recorrido";

  if (reachCard.mode === "all-open") {
    const muted =
      reachCard.yesSub && reachCard.yesSub.trim() && reachCard.yesSub !== "Todos los tramos habilitados"
        ? reachCard.yesSub.trim()
        : null;
    return {
      variant: "all-open",
      singleLine: "Podés circular hasta el límite con Chile",
      mutedLine: muted,
      lastPlaceStrong: null,
      kmLine: null,
      showNoRow: false,
      noCutStrong: null,
      noReason: null,
    };
  }

  if (reachCard.mode === "all-closed") {
    const ci = firstClosedIndex(segs);
    const noCut = ci >= 0 ? tailPlace(segs[ci].name) : null;
    const notes = ci >= 0 ? segs[ci].notes?.trim() || null : null;
    return {
      variant: "all-closed",
      singleLine: reachCard.yesPlace,
      mutedLine: null,
      lastPlaceStrong: null,
      kmLine: null,
      showNoRow: Boolean(noCut),
      noCutStrong: noCut,
      noReason: notes,
    };
  }

  const lastIdx = lastReachableSegmentIndex(payload);
  const place = lastIdx != null ? tailPlace(segs[lastIdx].name) : null;
  const km = lastIdx != null ? cumulativeKmThrough(segs, lastIdx) : null;
  const kmLine = km != null ? ` · ${km} km desde ${origin}` : null;
  const ci = firstClosedIndex(segs);
  const showNo = ci >= 0;
  return {
    variant: "mixed",
    singleLine: null,
    mutedLine: null,
    lastPlaceStrong: place,
    kmLine,
    showNoRow: showNo,
    noCutStrong: showNo && ci >= 0 ? tailPlace(segs[ci].name) : null,
    noReason: showNo && ci >= 0 ? segs[ci].notes?.trim() || null : null,
  };
}

function buildReachCompact(rc: HomeRouteReachCard, originLabel?: string): HomeRouteReachCompact {
  const origin = originLabel?.trim() || "Mendoza";
  let yesDetail = rc.yesSub?.trim() || null;
  if (yesDetail?.includes(`km desde ${origin}`)) {
    yesDetail = yesDetail
      .replace("Último punto accesible · ", "Último punto · ")
      .replace(` desde ${origin}`, "");
  }
  return {
    yesPlace: rc.yesPlace,
    yesDetail,
    showNo: rc.showNoZone,
    noPlace: rc.noPlace,
    noDetail: rc.noSub,
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
      if (isTunnelInternationalSegment(tunnel)) {
        return {
          message: "El tránsito está interrumpido en el Túnel Internacional.",
          tone: "danger",
        };
      }
      return {
        message: `El tránsito está interrumpido en ${tunnel.name.trim()}.`,
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

function buildMobileTimeline(rows: HomeRouteCardTimelineRow[]): HomeRouteCardDisplayItem[] {
  const items: HomeRouteCardDisplayItem[] = [];
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
    if (runLen < 3) {
      for (let k = i; k < j; k++) {
        items.push({ kind: "segment", row: rows[k] });
      }
      i = j;
      continue;
    }
    const middle = rows.slice(i + 1, j - 1);
    items.push({ kind: "segment", row: rows[i] });
    items.push({ kind: "collapsed", count: runLen - 2, rows: middle });
    items.push({ kind: "segment", row: rows[j - 1] });
    i = j;
  }
  return items;
}

export function buildHomeRouteCardView(
  payload: RouteSegmentsPayload,
  profile: RouteProfileConfig,
): HomeRouteCardView {
  const iso = payload.sourceUpdatedAt?.trim() || payload.updatedAt?.trim() || "";
  const segments = payload.segments;
  const total = segments.length;
  const openN = countOpen(segments);
  const enabledSummary = `${openN} de ${total} tramos habilitados`;

  const freshness = iso ? buildFreshness(iso) : { dot: "amber" as const, label: "Sin marca de tiempo" };

  const bi = firstBlockingIndex(segments);
  const { message: mainAlertMessage, tone: mainAlertTone } = buildMainAlert(payload, bi);

  const showAlertBanner = hasCorteTotal(segments);

  const dataFreshnessIso =
    payload.sourceUpdatedAt?.trim() || payload.updatedAt?.trim() || "";
  const staleOverTwoHours = dataFreshnessIso ? isStaleOverTwoHours(dataFreshnessIso) : false;

  const openCount = segments.filter((s) => s.status === "OPEN").length;
  const hasClosedSegment = segments.some((s) => s.status === "CLOSED");
  const openPct = total > 0 ? (openCount / total) * 100 : 0;

  const alertBannerText = showAlertBanner ? mainAlertMessage : "";
  const reachCard = buildReachCard(payload, profile);
  const reachCompact = buildReachCompact(reachCard, profile.reachKmOriginLabel);
  const reachSummary = buildReachSummary(payload, profile, reachCard);

  const timeline: HomeRouteCardTimelineRow[] = segments.map((s, index) => {
    const isBlocking = bi >= 0 && index === bi;
    const isAfterBlocking = bi >= 0 && index > bi;
    const isCriticalFinal =
      isBlocking && (s.flags.international || s.status === "CLOSED" || s.status === "PARTIAL");
    const kmD = formatKm(s.lengthKm);
    const strong = s.statusLabel?.trim();
    const { origin, dest } = splitSegmentName(s.name);
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
      nameOrigin: origin,
      nameDest: dest,
    };
  });

  const mobileTimeline = buildMobileTimeline(timeline);
  const rc = payload.routeCode?.trim() || profile.routeCode;
  const titleId = `home-route-${payload.passSlug}-title`;
  const tramosBodyId = `ruta-tramos-${payload.profile}`;
  const pasoCfg = getPasoBySlug(profile.passSlug);

  return {
    profile: payload.profile,
    tramosBodyId,
    title: profile.homeCardTitle,
    titleId,
    cardRouteNumber: `RN ${rc}`,
    cardRouteRegion: profile.province,
    cardRouteName: pasoCfg?.shortName?.trim() || profile.passSlug,
    detailHref: profile.homeDetailPath,
    timelineAriaLabel: `Tramos RN ${rc}`,
    timelineAriaLabelMobile: `Tramos RN ${rc} (vista compacta)`,
    updatedAtIso: iso || new Date().toISOString(),
    dataFreshnessIso: dataFreshnessIso || iso || new Date().toISOString(),
    staleOverTwoHours,
    progress: {
      openCount,
      total,
      openPct,
      hasClosedSegment,
    },
    freshnessDot: freshness.dot,
    freshnessLabel: freshness.label,
    enabledSummary,
    showAlertBanner,
    alertBannerText,
    mainAlertMessage,
    mainAlertTone,
    headline: payload.summary.headline,
    reachCard,
    reachCompact,
    reachSummary,
    timeline,
    mobileTimeline,
  };
}
