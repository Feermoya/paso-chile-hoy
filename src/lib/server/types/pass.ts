export type PassStatus = "open" | "closed" | "conditional" | "unknown";

export type ForecastPeriod = {
  label: string;
  temperatureC: number | null;
  condition: string | null;
  windDirection: string | null;
  windSpeedText: string | null;
  visibility: string | null;
};

export type ProviderUpdate = {
  name: string;
  updatedAt: string | null;
};

export type CurrentWeather = {
  temperatureC: number | null;
  condition: string | null;
  windText: string | null;
  sunrise: string | null;
  sunset: string | null;
  visibilityKm: number | null;
  /** Valor del `datetime` del bloque SMN “Ahora”, si existe. */
  updatedAt: string | null;
};

export type PassPageSnapshot = {
  slug: string;
  sourceUrl: string;
  fetchedAt: string;
  province: string | null;
  borderingCountry: string | null;
  passName: string | null;
  routeDescription: string | null;
  status: PassStatus;
  statusText: string | null;
  schedule: string | null;
  contact: string | null;
  currentWeather: CurrentWeather;
  next24h: ForecastPeriod[];
  usefulLinks: { label: string; href: string | null }[];
  providers: ProviderUpdate[];
};
