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
