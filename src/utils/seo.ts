/** Origen canónico público (apex). Debe coincidir con `astro.config` y `public/robots.txt`. */
export const SITE_ORIGIN_DEFAULT = "https://pasochilehoy.com";

function envString(key: string): string | undefined {
  const meta = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const value = meta?.[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function resolveSiteUrl(): string {
  const env = envString("PUBLIC_SITE_URL");
  if (env) return env.replace(/\/$/, "");
  const site = envString("SITE");
  if (site) return site.replace(/\/$/, "");
  return SITE_ORIGIN_DEFAULT;
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = envString("PUBLIC_SITE_NAME") || "Paso Chile Hoy";

/** Meta description principal de la marca / home (~155 caracteres). */
export const SITE_DESCRIPTION =
  "Consultá qué pasos a Chile están abiertos hoy: tránsito, horarios, clima y rutas de Cristo Redentor, Pehuenche y Agua Negra.";

/** Texto del JSON-LD `WebSite` (marca + intención). */
export const WEB_SITE_SCHEMA_DESCRIPTION =
  "Paso Chile Hoy informa el tránsito y el estado del paso a Chile: Cristo Redentor, Pehuenche y Agua Negra, con horario y clima desde datos públicos oficiales.";

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

/**
 * Título de documento, estable (sin ABIERTO/CERRADO).
 * Una sola URL por paso cubre el racimo de búsquedas: no hace falta una página por frase.
 * El de Cristo Redentor abre con la consulta real (“tránsito en vivo”) y cierra con la duda que hace clic.
 */
export function passDocumentTitle(passSlug: string, passShortName: string): string {
  switch (passSlug) {
    case "cristo-redentor":
      return "Tránsito en vivo: Paso Cristo Redentor, ¿abierto hoy?";
    case "pehuenche":
      return "Paso Pehuenche hoy: ¿está abierto? Horario y clima";
    case "agua-negra":
      return "Paso Agua Negra hoy: ¿está abierto? Horario y clima";
    default:
      return `Paso ${passShortName} hoy: ¿está abierto? Horario y clima`;
  }
}

/** Descripción estable del snippet. Distinta del título: dice qué se resuelve al entrar. */
export function passMetaDescription(passSlug: string, passShortName: string): string {
  switch (passSlug) {
    case "cristo-redentor":
      return "Mirá ahora si podés cruzar: abierto o cerrado, horario de hoy y clima en el túnel. El tránsito del Paso Cristo Redentor, listo antes de salir de Mendoza.";
    case "pehuenche":
      return "¿Salís de Malargüe a Chile? Mirá si el Paso Pehuenche está abierto, el horario de cruce y el clima en cordillera antes de tomar la ruta.";
    case "agua-negra":
      return "¿Subís desde San Juan? Mirá si el Paso Agua Negra está abierto, el horario y el clima en altura antes de encarar la RN 150.";
    default:
      return `Mirá si el Paso ${passShortName} está abierto hoy, el horario de cruce y el clima en cordillera antes de viajar.`;
  }
}

/** Preguntas reales del racimo de búsquedas. El mismo texto va al HTML y al FAQPage. */
export function passFaqItems(passSlug: string): readonly { question: string; answer: string }[] {
  switch (passSlug) {
    case "cristo-redentor":
      return [
        {
          question: "¿Dónde veo el tránsito en vivo del Paso Cristo Redentor?",
          answer:
            "En esta página. Arriba figura si el cruce está abierto, cerrado o condicionado, el horario de hoy y el clima en alta montaña. Podés actualizar el parte con el botón de la ficha. No es una cámara de la ruta: es el estado oficial más reciente, resumido para decidir si salís.",
        },
        {
          question: "¿El Paso Cristo Redentor está abierto hoy?",
          answer:
            "El cartel de arriba sale de datos públicos de Gendarmería y Vialidad. Si dice abierto, revisá también el horario y si hay corte en la Ruta 7 o en el túnel. Si el margen es justo, confirmá en la fuente oficial antes de salir de Mendoza.",
        },
        {
          question: "¿Cuál es el horario del Paso Cristo Redentor?",
          answer:
            "El horario publicado está en la ficha y cambia según la temporada, a veces con ventanas nocturnas en invierno. No uses el de ayer: miralo el mismo día del viaje.",
        },
        {
          question: "¿Los Libertadores es el mismo paso que Cristo Redentor?",
          answer:
            "Sí. En Argentina se lo llama Paso Cristo Redentor o Sistema Cristo Redentor, y del lado chileno, paso Los Libertadores. Es el cruce principal entre Mendoza y Chile por la Ruta Nacional 7.",
        },
        {
          question: "¿Hay corte de tránsito en la Ruta 7 o en el túnel?",
          answer:
            "La ficha muestra si Vialidad informa corte o restricción en la ruta o en el túnel internacional, además del estado del paso. Puede haber corte en cordillera aunque en el valle esté despejado.",
        },
      ];
    case "pehuenche":
      return [
        {
          question: "¿El Paso Pehuenche está abierto hoy?",
          answer:
            "En esta página ves si el cruce Malargüe–Talca figura abierto, cerrado o condicionado, con el horario y el clima en cordillera. Confirmá en la fuente oficial antes de salir del sur mendocino.",
        },
        {
          question: "¿Cuál es el horario del Paso Pehuenche?",
          answer:
            "El horario publicado está en la ficha y puede cambiar por temporada o por nieve. Revisalo el mismo día del viaje.",
        },
        {
          question: "¿El Pehuenche sirve si el Cristo Redentor está cerrado?",
          answer:
            "A veces es la alternativa desde el sur de Mendoza hacia Talca, por la RN 145. No des por hecho que está habilitado porque el Cristo cerró: mirá el estado de este paso por separado.",
        },
      ];
    case "agua-negra":
      return [
        {
          question: "¿El Paso Agua Negra está abierto hoy?",
          answer:
            "Acá ves si el cruce San Juan–Chile figura habilitado, el horario y el clima. Es un paso de gran altitud: el tiempo en el valle no alcanza para decidir.",
        },
        {
          question: "¿Se puede cruzar de San Juan a Chile por Agua Negra?",
          answer:
            "Cuando el paso está abierto y dentro del horario. La ruta es la RN 150, entre Las Flores y Huanta. La nieve y el viento lo cierran seguido.",
        },
        {
          question: "¿Cuál es el horario del Paso Agua Negra?",
          answer:
            "El horario del día está en la ficha. Confirmalo antes de subir: en altura el estado cambia en pocas horas.",
        },
      ];
    default:
      return [];
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
  void opts.regionLabel;

  const emoji = STATUS_EMOJI[status];
  const headline = opts.statusHeadline?.trim() || STATUS_LABEL[status];

  /** Title y description estables: el estado en vivo va al OG, no al snippet que Google cachea. */
  const title = passDocumentTitle(passSlug, passShortName);
  const description = passMetaDescription(passSlug, passShortName);

  const ogTitle = title;
  const climaPart =
    weatherDesc && tempC !== null ? ` ${weatherDesc} · ${tempC}°C.` : weatherDesc ? ` ${weatherDesc}.` : "";
  const horarioPart = schedule ? ` Horario: ${schedule} h.` : "";
  const ogDescription =
    `${passName}: ${headline}.${horarioPart}${climaPart} Actualización: ${freshnessLabel}.`.replace(
      /\s+/g,
      " ",
    );

  const ogImage = resolveOgImageUrlForPass(passSlug);
  const canonical = `${SITE_URL}/${passSlug}`;
  const ogImageAlt = `${passName} — estado, horario y clima — ${SITE_NAME}`;

  return {
    title,
    description,
    canonical,
    ogTitle,
    ogDescription: `${emoji} ${ogDescription}`.trim(),
    ogImage,
    ogImageAlt,
    twitterCard: "summary_large_image" as const,
  };
}

export function buildHomeMeta(): LayoutSeoBundle {
  return {
    title: "Paso a Chile hoy: ¿Qué pasos están abiertos? | Estado y clima",
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    ogTitle: "Paso a Chile hoy: ¿Qué pasos están abiertos? | Estado y clima",
    ogDescription: SITE_DESCRIPTION,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt:
      "Paso Chile Hoy — Cristo Redentor, Pehuenche, Agua Negra: estado del cruce Argentina–Chile",
    twitterCard: "summary_large_image",
  };
}

/** `/legal` — descripción única; OG alineado sin depender del título del documento. */
export function buildLegalPageMeta(): LayoutSeoBundle {
  const title = `Aviso legal — ${SITE_NAME}`;
  const description =
    "Aviso legal y privacidad de Paso Chile Hoy. Sitio independiente: confirmá el estado del paso en la fuente oficial antes de viajar.";
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
        "Sistema Cristo Redentor",
        "Los Libertadores",
        "Túnel Cristo Redentor",
        "Paso Internacional Cristo Redentor",
        "Christ the Redeemer border crossing",
      ];
    case "pehuenche":
      return ["Paso Pehuenche", "Paso El Pehuenche", "Pehuenche", "Pehuenche pass"];
    case "agua-negra":
      return ["Paso Agua Negra", "Paso de Agua Negra", "Agua Negra", "Agua Negra pass"];
    case "el-sosneado":
      return ["Paso El Sosneado", "El Sosneado"];
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
      "Acá ves una síntesis del estado publicado (abierto, condicionado o cerrado), el horario que figura en la fuente oficial y el clima en altura. Si el margen es ajustado o hay alertas de nieve o viento, conviene revisar el detalle del paso y llamar o escribir a Gendarmería antes de largar.",
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
      "Para cualquier persona que vaya a cruzar desde Mendoza o San Juan hacia Chile: turistas, transportistas o residentes. El sitio está principalmente en español; incluye frases breves en inglés para quien busca en ese idioma.",
  },
  {
    question: "¿Esto reemplaza la información oficial?",
    answer:
      "No. Paso Chile Hoy ordena y muestra información ya publicada por organismos del Estado argentino; no es un canal oficial. La decisión de viajar y las verificaciones finales son responsabilidad de cada persona, ante la fuente oficial y las autoridades.",
  },
];

/** FAQ específicas de la landing `/paso-a-chile-hoy`. */
export const PASO_A_CHILE_FAQ_ITEMS: readonly { question: string; answer: string }[] = [
  {
    question: "¿Cómo sé si el paso a Chile está abierto hoy?",
    answer:
      "En esta página y en cada paso ves si Cristo Redentor, Pehuenche y Agua Negra figuran como abiertos, cerrados o condicionados, con horario y clima. La fuente son datos públicos oficiales; confirmá siempre en Gendarmería antes de viajar.",
  },
  {
    question: "¿Qué pasos a Chile cubre Paso Chile Hoy?",
    answer:
      "Los tres cruces principales desde el oeste argentino: Cristo Redentor (Mendoza, ruta internacional 7), Pehuenche (Malargüe–Talca) y Agua Negra (San Juan, gran altitud). Cada uno tiene su página con estado, horario y clima.",
  },
  {
    question: "¿Qué debo revisar antes de cruzar a Chile?",
    answer:
      "Estado y horario del paso en la web oficial, clima en cordillera, documentación de ingreso, estado de rutas nacionales si tu tramo depende de Vialidad, y alertas de nieve o viento en altura.",
  },
  {
    question: "¿Con qué frecuencia se actualiza el estado?",
    answer:
      "Los datos se relevan de forma automática desde fuentes públicas del Estado argentino varias veces al día. La hora de la última actualización figura en cada paso; no es un dato en vivo segundo a segundo.",
  },
];

export function buildPasoAChileHoyMeta(): LayoutSeoBundle {
  const title = "Paso a Chile hoy: estado de los cruces y horarios";
  const description =
    "¿Vas a cruzar a Chile? Revisá el estado de los principales pasos fronterizos, horarios, clima y condiciones de las rutas.";
  return {
    title,
    description,
    canonical: `${SITE_URL}/paso-a-chile-hoy`,
    ogTitle: title,
    ogDescription: description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: "Paso a Chile hoy — Cristo Redentor, Pehuenche y Agua Negra",
    twitterCard: "summary_large_image",
  };
}

export function buildPasoAChileHoyStructuredGraph(): Record<string, unknown> {
  const pageUrl = `${SITE_URL}/paso-a-chile-hoy`;
  const webpageId = `${pageUrl}#webpage`;
  const faqId = `${pageUrl}#faq`;

  const faqEntities = PASO_A_CHILE_FAQ_ITEMS.map((item, i) => ({
    "@type": "Question",
    "@id": `${pageUrl}#faq-q${i + 1}`,
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
        url: pageUrl,
        name: "Paso a Chile hoy: estado de los cruces y horarios",
        description:
          "Guía para consultar los principales pasos a Chile: Cristo Redentor, Pehuenche y Agua Negra, con horarios y clima.",
        inLanguage: "es-AR",
        isPartOf: { "@id": schemaWebsiteId() },
        mainEntity: { "@id": faqId },
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
        name: "Paso a Chile hoy: ¿Qué pasos están abiertos? | Estado y clima",
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
