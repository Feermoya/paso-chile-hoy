/**
 * Fuentes HTML públicas (Argentina.gob.ar — pasos internacionales).
 *
 * Los pasos activos se definen en `@/data/pasos.ts` (URL derivada de routeId + routeSlug).
 */
import { buildArgentinaPassSourceUrl, getActivePasos, type PasoConfig } from "@/data/pasos";

export type PassSourceConfig = {
  slug: string;
  name: string;
  sourceUrl: string;
};

function pasoToSource(p: PasoConfig): PassSourceConfig {
  return {
    slug: p.slug,
    name: p.name,
    sourceUrl: buildArgentinaPassSourceUrl(p),
  };
}

export const passes: PassSourceConfig[] = getActivePasos().map(pasoToSource);

/** Slug del paso por defecto (primer paso activo). */
export const defaultFeaturedPassSlug: string = passes[0]?.slug ?? "cristo-redentor";

export function getPassConfigBySlug(slug: string): PassSourceConfig | undefined {
  return passes.find((p) => p.slug === slug);
}

export function listPassSlugs(): string[] {
  return passes.map((p) => p.slug);
}
