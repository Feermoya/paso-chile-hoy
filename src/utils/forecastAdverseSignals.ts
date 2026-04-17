import type { DrivingForecastItemInput } from "@/utils/drivingConditions";

/**
 * Prioridad estricta (sin intensidad ni NLP):
 * 1. `snow` — nieve / aguanieve / mezclas nieve–lluvia / tormenta(s) fuerte(s)
 * 2. `storm` — tormenta(s) sin señal de nieve en el texto
 * 3. `rain` — lluvia, precipitaciones, chaparrones, mal tiempo, etc.
 * 4. `none`
 *
 * Alineado a `forecastAssessment` en `drivingConditions.ts` (misma función de tier).
 */

function normalizeDesc(description: string | undefined): string {
  return (description ?? "").toLowerCase();
}

/** Una fila aislada: mismo criterio que el barrido global (prioridad snow → storm → rain). */
export function forecastAdverseTierForDescription(description: string | undefined): "none" | "snow" | "storm" | "rain" {
  return forecastAdverseTier([{ description }]);
}

function matchesSnowTier(d: string): boolean {
  if (
    d.includes("nevada") ||
    d.includes("nevadas") ||
    d.includes("nieve") ||
    d.includes("aguanieve") ||
    d.includes("lluvia y nev") ||
    d.includes("lluvias y nev") ||
    d.includes("lluvia y nieve") ||
    d.includes("lluvias y nieve") ||
    d.includes("tormenta fuerte") ||
    d.includes("tormentas fuertes")
  ) {
    return true;
  }
  return false;
}

function matchesStormTier(d: string): boolean {
  if (matchesSnowTier(d)) return false;
  if (d.includes("nev")) return false;
  if (d.includes("tormenta")) return true;
  return false;
}

function matchesRainTier(d: string): boolean {
  if (matchesSnowTier(d) || matchesStormTier(d)) return false;
  if (
    d.includes("lluvia") ||
    d.includes("lluvias") ||
    d.includes("llovizna") ||
    d.includes("lloviznas") ||
    d.includes("precipit") ||
    d.includes("chaparron") ||
    d.includes("chaparrones") ||
    d.includes("mal tiempo")
  ) {
    return true;
  }
  return false;
}

export function forecastAdverseTier(
  forecast: DrivingForecastItemInput[],
): "none" | "snow" | "storm" | "rain" {
  for (const f of forecast) {
    const d = normalizeDesc(f.description);
    if (matchesSnowTier(d)) return "snow";
  }
  for (const f of forecast) {
    const d = normalizeDesc(f.description);
    if (matchesStormTier(d)) return "storm";
  }
  for (const f of forecast) {
    const d = normalizeDesc(f.description);
    if (matchesRainTier(d)) return "rain";
  }
  return "none";
}
