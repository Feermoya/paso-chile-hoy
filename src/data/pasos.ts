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
    routeId: 30,
    routeSlug: "Paso-Pehuenche",
    localityAR: "Malargüe",
    localityCL: "Talca",
    provinceAR: "Mendoza",
    altitudeM: 2553,
    lat: -35.265,
    lng: -70.443,
    active: false,
    comingSoon: true,
  },
  {
    slug: "el-sosneado",
    name: "Paso El Sosneado",
    shortName: "El Sosneado",
    routeId: 31,
    routeSlug: "Paso-El-Sosneado",
    localityAR: "San Rafael",
    localityCL: "Curicó",
    provinceAR: "Mendoza",
    altitudeM: 2462,
    lat: -34.82,
    lng: -69.87,
    active: false,
    comingSoon: true,
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
