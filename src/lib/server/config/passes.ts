/**
 * Fuentes HTML públicas (Argentina.gob.ar — pasos internacionales).
 *
 * Actualización periódica: programar en el hosting el mismo comando que en local:
 * `npm run update:all-passes` (no requiere tocar parser ni API).
 */
export type PassSourceConfig = {
  slug: string;
  name: string;
  sourceUrl: string;
};

export const passes: PassSourceConfig[] = [
  {
    slug: "cristo-redentor",
    name: "Sistema Cristo Redentor",
    sourceUrl:
      "https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor",
  },
  {
    slug: "las-lenas",
    name: "Las Leñas",
    sourceUrl:
      "https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/98/Las-Le%C3%B1as",
  },
];

/** Slug del paso destacado en la página de inicio (primer ítem de `passes`). */
export const defaultFeaturedPassSlug: string = passes[0]?.slug ?? "cristo-redentor";

export function getPassConfigBySlug(slug: string): PassSourceConfig | undefined {
  return passes.find((p) => p.slug === slug);
}

export function listPassSlugs(): string[] {
  return passes.map((p) => p.slug);
}
