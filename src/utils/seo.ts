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
  "Estado en tiempo real del Paso Cristo Redentor y pasos internacionales entre Mendoza y Chile. Horario, clima y condiciones actualizados.";

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
}) {
  const { passName, passSlug, status, schedule, tempC, weatherDesc, freshnessLabel } = opts;

  const emoji = STATUS_EMOJI[status];
  const label = STATUS_LABEL[status];

  const title = `${passName} — ${emoji} ${label} | ${SITE_NAME}`;

  const climaPart =
    weatherDesc && tempC !== null ? ` Clima: ${weatherDesc}, ${tempC}°C.` : "";

  const horarioPart = schedule ? ` Horario: ${schedule} h.` : "";

  const description =
    `Estado actual del ${passName}: ${label}.${horarioPart}${climaPart} ` +
    `Información actualizada ${freshnessLabel} — Mendoza, Argentina.`;

  const ogTitle = `${emoji} ${passName} — ${label}`;
  const ogDescription = description;
  const ogImage = `${SITE_URL}/og-image.png`;
  const canonical = `${SITE_URL}/${passSlug}`;

  return { title, description, ogTitle, ogDescription, ogImage, canonical };
}

export function buildHomeMeta() {
  return {
    title: `${SITE_NAME} — Estado de pasos internacionales Mendoza a Chile`,
    description: SITE_DESCRIPTION,
    ogTitle: "🏔️ Paso Chile Hoy — ¿Está abierto el paso a Chile?",
    ogDescription: SITE_DESCRIPTION,
    ogImage: `${SITE_URL}/og-image.png`,
    canonical: `${SITE_URL}/`,
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
      return ["Paso Pehuenche", "Pehuenche", "Malargüe", "Talca", "paso pehuenche mendoza"];
    case "el-sosneado":
      return ["Paso El Sosneado", "El Sosneado", "San Rafael", "Curicó"];
    default:
      return [shortName, name];
  }
}
