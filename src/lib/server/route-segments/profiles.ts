import type { RouteProfileConfig } from "@/types/route-segments";

const CRISTO_REDENTOR: RouteProfileConfig = {
  profile: "cristo-redentor",
  passSlug: "cristo-redentor",
  routeName: "Ruta Nacional 7",
  routeCode: "7",
  province: "Mendoza",
  segmentOrder: "asc",
  homeCardTitle: "Estado de la ruta RN 7 hacia Cristo Redentor",
  homeDetailPath: "/cristo-redentor",
  reachKmOriginLabel: "Mendoza",
  expectedSegments: [
    "Lte.Con San Luis - Mendoza",
    "Empalme RN 40 - Potrerillos",
    "Potrerillos - Uspallata",
    "Uspallata - Polvaredas",
    "Polvaredas - Punta de Vacas",
    "Punta De Vacas - Puente Del Inca",
    "Puente Del Inca - Las Cuevas",
    "Tunel Internacional",
  ],
};

const AGUA_NEGRA: RouteProfileConfig = {
  profile: "agua-negra",
  passSlug: "agua-negra",
  routeName: "Ruta Nacional 150",
  routeCode: "150",
  province: "San Juan",
  segmentOrder: "asc",
  homeCardTitle: "Estado de la ruta RN 150 hacia Agua Negra",
  homeDetailPath: "/agua-negra",
  headlineWhenAllOpen: "Ruta operativa hacia Agua Negra",
  reachAllOpenPrimary: "Podés circular hasta el límite con Chile",
  reachAllOpenSubTemplate: "Último tramo: {lastSegmentName}",
  reachKmOriginLabel: "San Juan",
  expectedSegments: [
    "Lte. Con La Rioja - Ischigualasto",
    "Ischigualasto - Huaco",
    "Emp. RN 40 - Jachal",
    "Jachal - Rodeo",
    "Rodeo - Las Flores",
    "Las Flores - Arrequintin",
    "Arrequintin - Lte. Con Chile",
  ],
};

/** Perfiles publicados bajo `public/snapshots/rutas/{profile}.json`. */
export const ROUTE_SEGMENT_PROFILES: readonly RouteProfileConfig[] = [CRISTO_REDENTOR, AGUA_NEGRA];

/** Orden de las cards de ruta en la home (subset de perfiles publicados). */
export const HOME_ROUTE_CARD_ORDER: readonly string[] = ["cristo-redentor", "agua-negra"];

const byProfile = new Map<string, RouteProfileConfig>(
  ROUTE_SEGMENT_PROFILES.map((p) => [p.profile, p]),
);

export function getRouteProfile(profile: string): RouteProfileConfig | undefined {
  return byProfile.get(profile);
}

export function listRouteProfiles(): RouteProfileConfig[] {
  return [...ROUTE_SEGMENT_PROFILES];
}
