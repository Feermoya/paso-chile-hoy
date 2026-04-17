/** Origen canónico público (apex). Debe coincidir con `astro.config` y `public/robots.txt`. */
export const SITE_ORIGIN_DEFAULT = "https://pasochilehoy.com";

function resolveSiteUrl(): string {
  const env = import.meta.env.PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const site = import.meta.env.SITE?.trim();
  if (site) return site.replace(/\/$/, "");
  return SITE_ORIGIN_DEFAULT;
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME =
  import.meta.env.PUBLIC_SITE_NAME?.trim() || "Paso Chile Hoy";

/** Meta description principal de la marca / home (~155–165 caracteres, español + señal EN). */
export const SITE_DESCRIPTION =
  "Paso Chile Hoy resume si el paso a Chile está abierto o cerrado hoy (Cristo Redentor, Pehuenche, Agua Negra), con horario y clima en cordillera desde datos públicos oficiales Argentina. English: border pass status for Mendoza and San Juan.";

/** Texto del JSON-LD `WebSite` (marca + intención + señal EN breve). */
export const WEB_SITE_SCHEMA_DESCRIPTION =
  "Paso Chile Hoy: estado del paso a Chile (Cristo Redentor, Pehuenche, Agua Negra), horario y clima a partir de datos públicos oficiales Argentina. English: Argentina–Chile border crossing status — Christ the Redeemer, Pehuenche, Agua Negra passes.";

/**
 * Imagen Open Graph por defecto (URL absoluta).
 * Para OG por paso en el futuro: añadir `/og-{slug}.png` y usar `resolveOgImageUrlForPass(slug)` abajo.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Resuelve la URL de imagen OG. Hoy siempre la global; en fase 2 devolver
 * `${SITE_URL}/og-${slug}.png` si existiera el asset en `public/`.
 */
export function resolveOgImageUrlForPass(_slug: string): string {
  void _slug;
  return DEFAULT_OG_IMAGE;
}

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

const STATUS_LABEL_EN: Record<PassStatus, string> = {
  abierto: "open",
  cerrado: "closed",
  condicionado: "restricted",
  sin_datos: "unknown",
};

/** Una línea EN para schema / copy secundario (mismo mapa que en meta de paso). */
export function passEnglishDiscoveryLine(passSlug: string): string {
  switch (passSlug) {
    case "cristo-redentor":
      return "Christ the Redeemer border crossing — Argentina–Chile (Los Libertadores).";
    case "pehuenche":
      return "Pehuenche pass — Malargüe to Talca.";
    case "agua-negra":
      return "Agua Negra pass — San Juan to Chile.";
    default:
      return "Argentina–Chile international border pass.";
  }
}

export function buildPassPageMeta(opts: {
  passName: string;
  passShortName: string;
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
  const {
    passName,
    passShortName,
    passSlug,
    status,
    schedule,
    tempC,
    weatherDesc,
    freshnessLabel,
  } = opts;
  const region = opts.regionLabel ?? "Mendoza, Argentina";

  const emoji = STATUS_EMOJI[status];
  const label = STATUS_LABEL[status];
  const headline = opts.statusHeadline?.trim() || label;
  const enLine = passEnglishDiscoveryLine(passSlug);
  const enStatus = STATUS_LABEL_EN[status];

  /** Título fuerte: intención “hoy / estado” + marca (estable por URL). */
  const title = `${passShortName} hoy — estado del paso a Chile | ${SITE_NAME}`;

  const routeHint =
    passSlug === "cristo-redentor"
      ? "Ruta internacional 7, lado argentino Villa Las Cuevas. "
      : passSlug === "pehuenche"
        ? "Enlace Malargüe (Mendoza) con Talca. "
        : passSlug === "agua-negra"
          ? "Enlace Las Flores (San Juan) con Huanta (Chile), paso de gran altitud. "
          : "";

  const description =
    `${passShortName} (${region}): ${label.toLowerCase()} ahora según la síntesis de esta web; horario y clima en el paso. ${routeHint}` +
    `Actualización relativa: ${freshnessLabel}. No reemplaza Gendarmería ni la web oficial. EN: ${enLine} Status summary: ${enStatus}.`;

  const ogTitle = `${emoji} ${passShortName} — ${label} | Paso a Chile`;
  const climaPart =
    weatherDesc && tempC !== null ? ` ${weatherDesc} · ${tempC}°C.` : weatherDesc ? ` ${weatherDesc}.` : "";
  const horarioPart = schedule ? ` Horario: ${schedule} h.` : "";
  const ogDescription =
    `${passName}: ${headline.toUpperCase()} ahora.${horarioPart}${climaPart} ${freshnessLabel}. ` +
    `${enLine}`;

  const ogImage = resolveOgImageUrlForPass(passSlug);
  const canonical = `${SITE_URL}/${passSlug}`;
  const ogImageAlt = `${passName} — estado, horario y clima — ${SITE_NAME}`;

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
    title: `Paso Chile Hoy — ¿paso a Chile abierto hoy? Cristo Redentor, Pehuenche, Agua Negra`,
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    ogTitle: "Paso Chile Hoy — estado del paso a Chile para decidir si salís",
    ogDescription:
      "Mirá en un solo lugar si Cristo Redentor (Los Libertadores), Pehuenche y Agua Negra están operativos, con horario publicado y clima de alta montaña. Datos públicos del Estado argentino. " +
      "EN: Open/closed snapshot for Argentina–Chile passes — Mendoza and San Juan.",
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt:
      "Paso Chile Hoy — Cristo Redentor, Pehuenche, Agua Negra: estado del cruce Argentina–Chile",
    twitterCard: "summary_large_image",
  };
}

/** `/legal` — descripción única; OG alineado sin depender del título del documento. */
export function buildLegalPageMeta(): LayoutSeoBundle {
  const title = `Aviso legal y fuentes de datos — ${SITE_NAME}`;
  const description =
    "Condiciones de uso, procedencia de los datos (Ministerio de Seguridad Argentina) y alcance del servicio informativo independiente pasochilehoy.com. Leé esto antes de tomar decisiones de viaje.";
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

/** Página de retorno post-apoyo; no indexar. */
export function buildGraciasPageMeta(): LayoutSeoBundle {
  const description =
    "Tu apoyo hace posible que este servicio siga siendo gratuito para todos.";
  return {
    title: `¡Gracias por tu apoyo! — ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/gracias`,
    ogTitle: "¡Gracias por apoyar Paso Chile Hoy!",
    ogDescription: description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: `Gracias — ${SITE_NAME}`,
    twitterCard: "summary_large_image",
  };
}

/**
 * 404: canonical a la URL dedicada; la página debe servirse con noindex.
 * (Mejor que apuntar siempre a la home, que confunde la URL real solicitada.)
 */
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

/**
 * Sinónimos, búsquedas frecuentes y señales EN para JSON-LD `alternateName`
 * (un solo idioma en HTML; esto ayuda a descubrimiento en inglés sin duplicar el sitio).
 */
export function passAlternateNames(slug: string, shortName: string, name: string): string[] {
  switch (slug) {
    case "cristo-redentor":
      return [
        "Cristo Redentor",
        "Paso Cristo Redentor",
        "Paso Los Libertadores",
        "Los Libertadores pass",
        "Christ the Redeemer border crossing",
        "Christ the Redeemer pass Argentina Chile",
        "Cruce internacional Mendoza Chile",
        "paso cristo redentor abierto o cerrado",
        "estado paso cristo redentor",
        "ruta 7 mendoza chile",
      ];
    case "pehuenche":
      return [
        "Paso Pehuenche",
        "Paso El Pehuenche",
        "Pehuenche",
        "Pehuenche pass",
        "Malargüe",
        "Talca",
        "Cruce Malargüe Talca",
        "paso pehuenche hoy",
        "paso pehuenche mendoza",
      ];
    case "agua-negra":
      return [
        "Paso Agua Negra",
        "Paso de Agua Negra",
        "Agua Negra pass",
        "Las Flores",
        "Huanta",
        "San Juan Chile",
        "paso agua negra hoy",
        "Cruce San Juan Coquimbo",
      ];
    case "el-sosneado":
      return ["Paso El Sosneado", "El Sosneado", "San Rafael", "Curicó"];
    default:
      return [shortName, name];
  }
}

/** Fragmento `#website` del JSON-LD global (debe coincidir con `MainLayout`). */
export function schemaWebsiteId(): string {
  return `${SITE_URL}#website`;
}

/** Preguntas frecuentes reutilizables (copy visible + FAQPage). */
export const HOME_FAQ_ITEMS: readonly { question: string; answer: string }[] = [
  {
    question: "¿Cómo sé si conviene salir hacia el paso?",
    answer:
      "Acá ves una síntesis del estado publicado (abierto, condicionado o cerrado), el horario que figre en la fuente oficial y el clima en altura. Si el margen es ajustado o hay alertas de nieve o viento, conviene revisar el detalle del paso y llamar o escribir a Gendarmería antes de largar.",
  },
  {
    question: "¿Con qué frecuencia se actualiza la información?",
    answer:
      "Los datos se obtienen de forma automática desde las páginas públicas del Ministerio de Seguridad de la Nación Argentina. La hora del último relevamiento aparece en la home y en cada paso; no es un dato en vivo segundo a segundo.",
  },
  {
    question: "¿Qué debería revisar antes de viajar?",
    answer:
      "Estado y horario del paso en la web oficial de pasos internacionales, estado de rutas en Vialidad si tu tramo depende de la cordillera, documentación y requisitos de ingreso al país vecino, y el pronóstico para la altitud del cruce.",
  },
  {
    question: "¿Sirve para turistas o solo para residentes?",
    answer:
      "Para cualquier persona que vaya a cruzar desde Mendoza o San Juan hacia Chile: turistas, transportistas o residentes. El idioma principal del sitio es español rioplatense; hay líneas breves en inglés donde ayuda al buscador.",
  },
  {
    question: "¿Esto reemplaza la información oficial?",
    answer:
      "No. Paso Chile Hoy ordena y muestra información ya publicada por organismos del Estado argentino; no es un canal oficial. La decisión de viajar y las verificaciones finales son responsabilidad de cada persona, ante la fuente oficial y las autoridades.",
  },
];

export function buildHomeStructuredGraph(itemListElement: Array<Record<string, unknown>>): Record<string, unknown> {
  const webpageId = `${SITE_URL}/#webpage`;
  const faqId = `${SITE_URL}/#faq`;
  const listId = `${SITE_URL}/#pasos-list`;

  const faqEntities = HOME_FAQ_ITEMS.map((item, i) => ({
    "@type": "Question",
    "@id": `${SITE_URL}/#faq-q${i + 1}`,
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: `${SITE_URL}/`,
        name: "Paso Chile Hoy — estado de pasos a Chile",
        description: SITE_DESCRIPTION,
        inLanguage: "es-AR",
        isPartOf: { "@id": schemaWebsiteId() },
        mainEntity: { "@id": faqId },
        hasPart: { "@id": listId },
      },
      {
        "@type": "ItemList",
        "@id": listId,
        name: "Pasos internacionales Argentina–Chile cubiertos",
        numberOfItems: itemListElement.length,
        isPartOf: { "@id": webpageId },
        itemListElement,
      },
      {
        "@type": "FAQPage",
        "@id": faqId,
        isPartOf: { "@id": webpageId },
        mainEntity: faqEntities,
      },
    ],
  };
}
