import type { ClimaResponse } from "@/lib/types/apiTypes";
import type { LasLenasCurrentWeather, LasLenasLocationRef } from "@/types/las-lenas";
import { SMN_STATION_NAMES } from "@/lib/server/las-lenas/constants";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function mapLocationFromClima(clima: ClimaResponse): LasLenasLocationRef {
  const loc = clima?.temperatura?.location;
  const sid = clima.temperatura?.station_id;
  const stationName =
    typeof sid === "number" && SMN_STATION_NAMES[sid] ? SMN_STATION_NAMES[sid] : "Estación SMN";

  return {
    id: loc?.id ?? 10868,
    name: loc?.name?.trim() || "Las Leñas",
    department: loc?.department?.trim() || "Malargüe",
    province: loc?.province?.trim() || "Mendoza",
    coord: {
      lat: loc?.coord?.lat ?? -35.15,
      lon: loc?.coord?.lon ?? -70.0833,
    },
    station:
      typeof sid === "number"
        ? {
            id: sid,
            name: stationName,
            distanceKm: num(loc?.distance),
          }
        : null,
    areaId: null,
  };
}

export function mapCurrentFromClima(clima: ClimaResponse): LasLenasCurrentWeather {
  const t = clima?.temperatura;
  const w = t?.wind;
  return {
    observedAt: typeof t?.date === "string" ? t.date.trim() || null : null,
    temperatureC: num(t?.temperature),
    description: t?.weather?.description?.trim() || null,
    humidity: num(t?.humidity),
    pressureHpa: num(t?.pressure),
    feelsLikeC: t?.feels_like != null ? num(t.feels_like) : null,
    visibilityKm: num(t?.visibility),
    wind: {
      direction: typeof w?.direction === "string" ? w.direction.trim() || null : null,
      degrees: w?.deg != null ? num(w.deg) : null,
      speedKmh: w?.speed != null ? num(w.speed) : null,
    },
  };
}
