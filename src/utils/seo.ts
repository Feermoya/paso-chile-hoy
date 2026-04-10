function resolveSiteUrl(): string {
  const env = import.meta.env.PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const site = import.meta.env.SITE?.trim();
  if (site) return site.replace(/\/$/, "");
  return "https://pasochilehoy.com";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME =
  import.meta.env.PUBLIC_SITE_NAME?.trim() || "Paso Chile Hoy";

export const SITE_DESCRIPTION =
  "Estado en tiempo real del Cristo Redentor, Pehuenche, Agua Negra y pasos internacionales entre Argentina y Chile. Horario, clima y condiciones actualizados.";

/** Imagen Open Graph por defecto (absoluta). Sin generación dinámica por URL. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Iconos en `public/favicon_io/` — un solo lugar para el layout. */
export const SITE_FAVICON = {
  ico: "/favicon_io/favicon.ico",
  png16: "/favicon_io/favicon-16x16.png",
  png32: "/favicon_io/favicon-32x32.png",
  appleTouch: "/favicon_io/apple-touch-icon.png",
} as const;

/**
 * Metadatos SSR que consume `MainLayout` (title, description, canonical, OG, Twitter).
 * Todo absoluto; sin depender de hidratación.
 */
export interface LayoutSeoBundle {
  title: string;
  /** Única por URL; texto estable (evitar ruido que cambie cada request). */
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  /** Accesibilidad en previews (Twitter / algunos crawlers). */
  ogImageAlt: string;
  twitterCard: "summary" | "summary_large_image";
}

export type PassStatus = "abierto" | "cerrado" | "condicionado" | "sin_datos";

const STATUS_EMOJI: Record<PassStatus, string> = {
  abierto: "✅",
  cerrado: "🔴",
  condicionado: "⚠️",
  sin_datos: "⚪",
};

const STATUS_LABEL: Record<PassStatus, string> = {
  abierto: "ABIERTO",
  cerrado: "CERRADO",
  condicionado: "CONDICIONADO",
  sin_datos: "Sin datos",
};

export function buildPassPageMeta(opts: {
  passName: string;
  passSlug: string;
  status: PassStatus;
  schedule: string | null;
  tempC: number | null;
  weatherDesc: string | null;
  freshnessLabel: string;
  /** Provincia para el snippet (ej. Mendoza o San Juan). */
  regionLabel?: string;
  /** Texto de estado para OG (p. ej. displayLabel de inferPassStatus). */
  statusHeadline?: string | null;
}) {
  const { passName, passSlug, status, schedule, tempC, weatherDesc, freshnessLabel } = opts;
  const region = opts.regionLabel ?? "Mendoza, Argentina";

  const emoji = STATUS_EMOJI[status];
  const label = STATUS_LABEL[status];
  const headline = opts.statusHeadline?.trim() || label;

  /** `<title>` estable por URL (evita reindexaciones por cada cambio de estado). El estado visible está en la página. */
  const title = `${passName} | ${SITE_NAME}`;

  /** Meta description estable: única por paso, sin volatilidad minuto a minuto. */
  const description =
    `${passName}: horario, estado y clima en la cordillera (${region}). ` +
    `Datos actualizados desde la fuente oficial; consultá el estado en vivo en la página.`;

  /** Open Graph / compartir: puede incluir estado para mejor CTR en redes. */
  const ogTitle = `${emoji} ${passName} — ${label}`;
  const climaPart =
    weatherDesc && tempC !== null ? ` ${weatherDesc} · ${tempC}°C.` : weatherDesc ? ` ${weatherDesc}.` : "";
  const horarioPart = schedule ? ` Horario: ${schedule} h.` : "";
  const ogDescription =
    `${passName}: ${headline.toUpperCase()} ahora.${horarioPart}${climaPart} ${freshnessLabel} — ${region}.`;

  const ogImage = DEFAULT_OG_IMAGE;
  const canonical = `${SITE_URL}/${passSlug}`;
  const ogImageAlt = `${passName}: estado, horario y clima — ${SITE_NAME}`;

  return {
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt,
    twitterCard: "summary_large_image" as const,
  };
}

export function buildHomeMeta(): LayoutSeoBundle {
  return {
    title: `${SITE_NAME} — Estado de pasos internacionales Argentina–Chile`,
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    ogTitle: "Paso Chile Hoy — ¿Está abierto el paso a Chile?",
    ogDescription: SITE_DESCRIPTION,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `${SITE_NAME}: Cristo Redentor, Pehuenche y Agua Negra — mapa de estado y clima`,
    twitterCard: "summary_large_image",
  };
}

/** `/legal` — descripción única; OG alineado sin depender del título del documento. */
export function buildLegalPageMeta(): LayoutSeoBundle {
  const title = `Aviso legal — ${SITE_NAME}`;
  const description =
    "Condiciones de uso, fuentes de datos oficiales y limitación de responsabilidad de Paso Chile Hoy (pasochilehoy.com). Servicio informativo independiente.";
  return {
    title,
    description,
    canonical: `${SITE_URL}/legal`,
    ogTitle: title,
    ogDescription: description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `Aviso legal — ${SITE_NAME}`,
    twitterCard: "summary_large_image",
  };
}

export function buildNotFoundMeta(): LayoutSeoBundle {
  const description =
    "La página que buscás no existe en Paso Chile Hoy. Volvé al inicio para ver el estado de los pasos a Chile.";
  return {
    title: `Página no encontrada — ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/404`,
    ogTitle: `No encontrado — ${SITE_NAME}`,
    ogDescription: description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `${SITE_NAME} — página no encontrada`,
    twitterCard: "summary_large_image",
  };
}

export function buildServerErrorMeta(): LayoutSeoBundle {
  const description =
    "Hubo un error al cargar Paso Chile Hoy. Intentá de nuevo más tarde o consultá la fuente oficial de pasos internacionales.";
  return {
    title: `Error temporal — ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/500`,
    ogTitle: `Error — ${SITE_NAME}`,
    ogDescription: description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `${SITE_NAME} — error temporal`,
    twitterCard: "summary_large_image",
  };
}

/** Sinónimos y búsquedas frecuentes por paso (JSON-LD alternateName). */
export function passAlternateNames(slug: string, shortName: string, name: string): string[] {
  switch (slug) {
    case "cristo-redentor":
      return [
        "Cristo Redentor",
        "Paso Los Libertadores",
        "Sistema Cristo Redentor",
        "Cruce internacional Mendoza Chile",
        "paso cristo redentor abierto o cerrado",
        "ruta 7 mendoza chile",
      ];
    case "pehuenche":
      return [
        "Paso Pehuenche",
        "Paso El Pehuenche",
        "Pehuenche",
        "Malargüe",
        "Talca",
        "Cruce Malargüe Talca",
        "paso pehuenche mendoza",
      ];
    case "agua-negra":
      return [
        "Paso Agua Negra",
        "Paso de Agua Negra",
        "Las Flores",
        "Huanta",
        "San Juan Chile",
        "Cruce San Juan Coquimbo",
      ];
    case "el-sosneado":
      return ["Paso El Sosneado", "El Sosneado", "San Rafael", "Curicó"];
    default:
      return [shortName, name];
  }
}
