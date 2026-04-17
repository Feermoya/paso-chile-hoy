import type { PasoConfig } from "@/data/pasos";
import {
  SITE_URL,
  passAlternateNames,
  passEnglishDiscoveryLine,
  schemaWebsiteId,
  type PassStatus,
} from "@/utils/seo";

export function openingHoursSpecsFromSchedule(schedule: string): Array<Record<string, unknown>> {
  const s = schedule.trim();
  if (!s) return [];
  const cleaned = s.replace(/\s*h\.?\s*$/i, "").trim();
  const parts = cleaned.split(/[-–]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || !parts[0] || !parts[1]) return [];
  return [
    {
      "@type": "OpeningHoursSpecification",
      opens: parts[0],
      closes: parts[1],
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
  ];
}

function crossingStatusProperty(displayStatus: PassStatus): Record<string, unknown> | null {
  if (displayStatus === "sin_datos") return null;
  const valueEs =
    displayStatus === "abierto"
      ? "Síntesis en este sitio: cruce habilitado según datos mostrados. Confirmar siempre en Gendarmería y fuente oficial."
      : displayStatus === "cerrado"
        ? "Síntesis en este sitio: cerrado o fuera de horario según datos mostrados. Confirmar en fuente oficial."
        : "Síntesis en este sitio: condicionado o con restricciones según datos oficiales.";
  return {
    "@type": "PropertyValue",
    name: "Estado del cruce (resumen)",
    value: valueEs,
  };
}

export function buildPassTouristAttractionSchema(opts: {
  paso: PasoConfig;
  scheduleText: string;
  displayStatus: PassStatus;
}): Record<string, unknown> {
  const { paso, scheduleText, displayStatus } = opts;
  const enLine = passEnglishDiscoveryLine(paso.slug);
  const statusProp = crossingStatusProperty(displayStatus);

  const description =
    `Cruce internacional entre ${paso.localityAR} (${paso.provinceAR}, Argentina) y ${paso.localityCL} (Chile). ` +
    `${enLine} Paso Chile Hoy resume horario y estado a partir de datos públicos del Estado argentino; ` +
    `para decidir el viaje hay que verificar en las fuentes oficiales.`;

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: paso.name,
    alternateName: passAlternateNames(paso.slug, paso.shortName, paso.name),
    description,
    url: `${SITE_URL}/${paso.slug}`,
    image: `${SITE_URL}/og-image.png`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: paso.lat,
      longitude: paso.lng,
      elevation: paso.altitudeM,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: paso.localityAR,
      addressRegion: paso.provinceAR,
      addressCountry: "AR",
    },
    openingHoursSpecification: openingHoursSpecsFromSchedule(scheduleText),
    ...(statusProp ? { additionalProperty: [statusProp] } : {}),
  };
}

/** Grafo JSON-LD por página de paso: página + filtro de migas + lugar. */
export function buildPassStructuredGraph(opts: {
  paso: PasoConfig;
  scheduleText: string;
  displayStatus: PassStatus;
}): Record<string, unknown> {
  const single = buildPassTouristAttractionSchema(opts);
  const { "@context": _ctx, ...attractionBody } = single;
  const attractionId = `${SITE_URL}/${opts.paso.slug}#place`;
  const pageId = `${SITE_URL}/${opts.paso.slug}#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...attractionBody,
        "@id": attractionId,
      },
      {
        "@type": "WebPage",
        "@id": pageId,
        url: `${SITE_URL}/${opts.paso.slug}`,
        name: `${opts.paso.shortName} — estado del paso a Chile`,
        inLanguage: "es-AR",
        isPartOf: { "@id": schemaWebsiteId() },
        about: { "@id": attractionId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/${opts.paso.slug}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: opts.paso.shortName,
            item: `${SITE_URL}/${opts.paso.slug}`,
          },
        ],
      },
    ],
  };
}
