/**
 * Las Leñas: clima actual vía mismo canal público que los pasos (`detalle_clima` gob.ar).
 * Pronóstico 3 días vía wttr.in (sin API key). Alertas SMN ws1 requieren JWT → no llamamos.
 */

import { fetchClima } from "@/lib/server/apiClient";
import { LAS_LENAS_LAT, LAS_LENAS_LON } from "@/lib/server/las-lenas/constants";
import { fetchWttrDailyOutlook } from "@/lib/server/las-lenas/wttrDailyOutlook";
import { mapCurrentFromClima, mapLocationFromClima } from "@/lib/server/las-lenas/mapClimaToLasLenas";
import type { LasLenasSnapshot } from "@/types/las-lenas";

const TTL_MS = 5 * 60 * 1000;
let cache: { expires: number; snapshot: LasLenasSnapshot } | null = null;

function emptyWarnings() {
  return {
    updatedAt: null as string | null,
    hasWarnings: false,
    maxLevel: null as number | null,
    days: [] as LasLenasSnapshot["warnings"]["days"],
    sourceUnavailable: true,
  };
}

async function buildSnapshot(): Promise<LasLenasSnapshot | null> {
  let clima;
  try {
    clima = await fetchClima(LAS_LENAS_LAT, LAS_LENAS_LON);
  } catch (e) {
    console.warn("[las-lenas] detalle_clima falló:", e instanceof Error ? e.message : e);
    return null;
  }

  const place = mapLocationFromClima(clima);
  const current = mapCurrentFromClima(clima);
  const forecast = await fetchWttrDailyOutlook(3);

  const snapshot: LasLenasSnapshot = {
    schemaVersion: 1,
    place,
    current,
    forecast,
    forecastSource: forecast.length > 0 ? "wttr_in" : null,
    warnings: emptyWarnings(),
    updatedAt: new Date().toISOString(),
  };

  return snapshot;
}

/** Snapshot con cache en memoria (Vercel: por instancia; reduce fan-out a gob.ar/wttr). */
export async function getLasLenasSnapshot(): Promise<LasLenasSnapshot | null> {
  const now = Date.now();
  if (cache && cache.expires > now) {
    return cache.snapshot;
  }
  const snapshot = await buildSnapshot();
  if (snapshot) {
    cache = { expires: now + TTL_MS, snapshot };
  }
  return snapshot;
}

export function __clearLasLenasCacheForTests(): void {
  cache = null;
}
