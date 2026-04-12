import type { RouteProfileConfig } from "@/types/route-segments";

const CRISTO_REDENTOR: RouteProfileConfig = {
  profile: "cristo-redentor",
  passSlug: "cristo-redentor",
  routeName: "Ruta Nacional 7",
  routeCode: "7",
  province: "Mendoza",
  segmentOrder: "asc",
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

/** Perfiles publicados bajo `public/snapshots/rutas/{profile}.json`. */
export const ROUTE_SEGMENT_PROFILES: readonly RouteProfileConfig[] = [CRISTO_REDENTOR];

const byProfile = new Map<string, RouteProfileConfig>(
  ROUTE_SEGMENT_PROFILES.map((p) => [p.profile, p]),
);

export function getRouteProfile(profile: string): RouteProfileConfig | undefined {
  return byProfile.get(profile);
}

export function listRouteProfiles(): RouteProfileConfig[] {
  return [...ROUTE_SEGMENT_PROFILES];
}
