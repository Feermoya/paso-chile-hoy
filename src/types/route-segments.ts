export type NationalRouteRowStatus =
  | "HABILITADA"
  | "CORTE PARCIAL"
  | "CORTE TOTAL"
  | "PRECAUCION"
  | "DESCONOCIDO";

export interface NationalRouteRow {
  province: string;
  routeCode: string;
  tramo: string;
  estadoHtml: string;
  estadoLabel: string;
  estadoNormalized: NationalRouteRowStatus;
  calzada: string | null;
  kmText: string | null;
  kmValue: number | null;
  conoceMasHtml: string | null;
  observaciones: string | null;
  updatedAtText: string | null;
  updatedAtIso: string | null;
}

export interface RouteProfileConfig {
  profile: string;
  passSlug: string;
  routeName: string;
  routeCode: string;
  province: string;
  expectedSegments: string[];
  segmentOrder: "asc" | "desc";
  /** Título de la card de ruta en la home. */
  homeCardTitle: string;
  /** Ruta del detalle del paso (href). */
  homeDetailPath: string;
  /** Headline del resumen cuando todos los tramos están OPEN. */
  headlineWhenAllOpen?: string;
  /** Texto principal del bloque “llegás hasta” cuando todos OPEN. */
  reachAllOpenPrimary?: string;
  /** Subtítulo; usar `{lastSegmentName}` para el último tramo del recorrido. */
  reachAllOpenSubTemplate?: string;
  /** Referencia para “X km desde …” en recorridos parciales. */
  reachKmOriginLabel?: string;
}

export type RouteSegmentStatus = "OPEN" | "PARTIAL" | "CLOSED" | "CAUTION" | "UNKNOWN";

export interface RouteSegmentItem {
  id: string;
  order: number;
  name: string;
  status: RouteSegmentStatus;
  statusLabel: string;
  surface: string | null;
  lengthKm: number | null;
  notes: string | null;
  updatedAt: string | null;
  flags: {
    critical: boolean;
    toll: boolean;
    international: boolean;
    scenic?: boolean;
  };
}

export interface RouteSegmentsSummary {
  totalSegments: number;
  openSegments: number;
  partialSegments: number;
  closedSegments: number;
  cautionSegments: number;
  firstBlockingSegmentId: string | null;
  canReachPass: boolean | "unknown";
  headline: string;
  worstStatus: RouteSegmentStatus;
}

export interface RouteSegmentsPayload {
  schemaVersion: 1;
  profile: string;
  passSlug: string;
  routeName: string;
  routeCode: string;
  province: string;
  updatedAt: string;
  sourceUpdatedAt: string | null;
  summary: RouteSegmentsSummary;
  segmentOrder: "asc" | "desc";
  segments: RouteSegmentItem[];
}
