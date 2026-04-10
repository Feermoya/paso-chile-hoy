import type { PasoConfig } from "@/data/pasos";
import { SITE_URL, passAlternateNames, type PassStatus } from "@/utils/seo";

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

export function buildPassTouristAttractionSchema(opts: {
  paso: PasoConfig;
  scheduleText: string;
  displayStatus: PassStatus;
}): Record<string, unknown> {
  const { paso, scheduleText, displayStatus } = opts;
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: paso.name,
    alternateName: passAlternateNames(paso.slug, paso.shortName, paso.name),
    description: `Paso internacional entre ${paso.localityAR} (Argentina) y ${paso.localityCL} (Chile). Estado en tiempo real del cruce fronterizo.`,
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
    ...(displayStatus !== "sin_datos" && {
      offers: {
        "@type": "Offer",
        name: `Estado actual: ${displayStatus}`,
        availability:
          displayStatus === "abierto"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    }),
  };
}
