export interface PasoConfig {
  slug: string;
  name: string;
  shortName: string;
  routeId: number;
  routeSlug: string;
  localityAR: string;
  localityCL: string;
  provinceAR: string;
  altitudeM: number;
  lat: number;
  lng: number;
  active: boolean;
  comingSoon?: boolean;
  /** Fuente de clima para el snapshot (por defecto SMN vía API oficial). */
  climaSource?: "smn" | "wttr";
  /** Query para wttr.in (ej. `Las+Flores,San+Juan,Argentina`). */
  wttrQuery?: string;
}

export const PASOS: PasoConfig[] = [
  {
    slug: "cristo-redentor",
    name: "Paso Sistema Cristo Redentor",
    shortName: "Cristo Redentor",
    routeId: 29,
    routeSlug: "Sistema-Cristo-Redentor",
    localityAR: "Villa Las Cuevas",
    localityCL: "Los Andes",
    provinceAR: "Mendoza",
    altitudeM: 3200,
    lat: -32.8211,
    lng: -69.9232,
    active: true,
  },
  {
    slug: "pehuenche",
    name: "Paso Pehuenche",
    shortName: "Pehuenche",
    routeId: 32,
    routeSlug: "Pehuenche",
    localityAR: "Malargüe",
    localityCL: "Talca",
    provinceAR: "Mendoza",
    altitudeM: 2553,
    lat: -35.79497,
    lng: -70.14326,
    active: true,
    comingSoon: false,
  },
  {
    slug: "agua-negra",
    name: "Paso Agua Negra",
    shortName: "Agua Negra",
    routeId: 27,
    routeSlug: "Agua-Negra",
    localityAR: "Las Flores",
    localityCL: "Huanta",
    provinceAR: "San Juan",
    altitudeM: 4765,
    lat: -30.32783,
    lng: -69.23614,
    active: true,
    comingSoon: false,
    climaSource: "wttr",
    wttrQuery: "Las+Flores,San+Juan,Argentina",
  },
];

export function buildArgentinaPassSourceUrl(p: PasoConfig): string {
  return `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/${p.routeId}/${p.routeSlug}`;
}

export function getPasoBySlug(slug: string): PasoConfig | undefined {
  return PASOS.find((p) => p.slug === slug);
}

export function getActivePasos(): PasoConfig[] {
  return PASOS.filter((p) => p.active);
}
