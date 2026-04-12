/** Modelo normalizado Las Leñas — desacoplado de SMN/wttr crudos. */

export interface LasLenasLocationRef {
  id: number;
  name: string;
  department: string;
  province: string;
  coord: {
    lon: number;
    lat: number;
  };
  station: {
    id: number;
    name: string;
    distanceKm: number | null;
  } | null;
  /** Reservado (ws1 georef); hoy no disponible sin JWT. */
  areaId: number | null;
}

export interface LasLenasCurrentWeather {
  observedAt: string | null;
  temperatureC: number | null;
  description: string | null;
  humidity: number | null;
  pressureHpa: number | null;
  feelsLikeC: number | null;
  visibilityKm: number | null;
  wind: {
    direction: string | null;
    degrees: number | null;
    speedKmh: number | null;
  };
}

export type LasLenasForecastPeriod = "early_morning" | "morning" | "afternoon" | "night";

export interface LasLenasForecastDay {
  date: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  description: string | null;
  humidityMin: number | null;
  humidityMax: number | null;
  rainProbabilityMin: number | null;
  rainProbabilityMax: number | null;
  dominantPeriod: LasLenasForecastPeriod | null;
}

export interface LasLenasWarningDay {
  date: string;
  maxLevel: number | null;
  eventCount: number;
  hasAnyWarning: boolean;
  periods: LasLenasForecastPeriod[];
}

export interface LasLenasWarningsBlock {
  updatedAt: string | null;
  hasWarnings: boolean;
  maxLevel: number | null;
  days: LasLenasWarningDay[];
  /** true si no hay API disponible sin credenciales (ws1 SMN). */
  sourceUnavailable: boolean;
}

export interface LasLenasSnapshot {
  schemaVersion: 1;
  place: LasLenasLocationRef;
  current: LasLenasCurrentWeather | null;
  /** Pronóstico resumido (wttr.in por coordenadas; distinto origen que `current`). */
  forecast: LasLenasForecastDay[];
  forecastSource: "wttr_in" | null;
  warnings: LasLenasWarningsBlock;
  updatedAt: string;
}
