import type {
  AlertRaw,
  ContactRaw,
  ForecastItemRaw,
  GpsRaw,
  LinkRaw,
  PassRaw,
  ProviderRaw,
  WeatherNowRaw,
} from "@/types/pass-raw";
import type {
  AlertView,
  ContactView,
  ForecastItemView,
  GpsView,
  LinkView,
  PassView,
  ProviderView,
  WeatherNowView,
} from "@/types/pass-view";

/** Convierte string vacío o solo espacios en `undefined`. */
export function cleanString(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const t = value.replace(/\u00a0/g, " ").trim();
  return t === "" ? undefined : t;
}

function mapContact(raw?: ContactRaw): ContactView | undefined {
  if (!raw) return undefined;
  const phone = cleanString(raw.phone);
  const telHref = cleanString(raw.telHref);
  if (!phone && !telHref) return undefined;
  return { phone, telHref };
}

function mapGps(raw?: GpsRaw): GpsView | undefined {
  if (!raw) return undefined;
  const lat = typeof raw.lat === "number" && Number.isFinite(raw.lat) ? raw.lat : undefined;
  const lng = typeof raw.lng === "number" && Number.isFinite(raw.lng) ? raw.lng : undefined;
  const openInMapsHref = cleanString(raw.geoHref);
  if (lat == null && lng == null && !openInMapsHref) return undefined;
  return { lat, lng, openInMapsHref };
}

function mapAlert(r: AlertRaw): AlertView {
  return {
    source: cleanString(r.source),
    title: cleanString(r.title),
    description: cleanString(r.description),
    detail: cleanString(r.detail),
  };
}

function isNonEmptyAlert(a: AlertView): boolean {
  return Boolean(a.source || a.title || a.description || a.detail);
}

function mapWeatherNow(raw?: WeatherNowRaw): WeatherNowView | undefined {
  if (!raw) return undefined;
  const description = cleanString(raw.description);
  const wind = cleanString(raw.wind);
  const sunrise = cleanString(raw.sunrise);
  const sunset = cleanString(raw.sunset);
  const visibilityText = cleanString(raw.visibilityText);
  const providerNote = cleanString(raw.providerNote);
  const temperatureC =
    typeof raw.temperatureC === "number" && Number.isFinite(raw.temperatureC)
      ? raw.temperatureC
      : undefined;
  const visibilityKm =
    typeof raw.visibilityKm === "number" && Number.isFinite(raw.visibilityKm)
      ? raw.visibilityKm
      : undefined;

  if (
    description == null &&
    wind == null &&
    sunrise == null &&
    sunset == null &&
    visibilityText == null &&
    providerNote == null &&
    temperatureC == null &&
    visibilityKm == null
  ) {
    return undefined;
  }

  return {
    description,
    temperatureC,
    wind,
    visibilityKm,
    visibilityText,
    sunrise,
    sunset,
    providerNote,
  };
}

function mapForecastItem(r: ForecastItemRaw): ForecastItemView {
  const temperatureC =
    typeof r.temperatureC === "number" && Number.isFinite(r.temperatureC)
      ? r.temperatureC
      : undefined;
  return {
    period: cleanString(r.period),
    description: cleanString(r.description),
    temperatureC,
    wind: cleanString(r.wind),
    visibility: cleanString(r.visibility),
  };
}

function mapLink(r: LinkRaw): LinkView | null {
  const text = cleanString(r.text);
  const url = cleanString(r.url);
  if (!text) return null;
  return { text, url };
}

function mapProvider(r: ProviderRaw): ProviderView | null {
  const name = cleanString(r.name);
  if (!name) return null;
  return {
    name,
    lastUpdated: cleanString(r.lastUpdated),
    lastUpdatedRaw: cleanString(r.lastUpdatedRaw),
  };
}

/**
 * Valida que exista `slug` no vacío. No valida el resto del contenido.
 */
export function validatePassRawForMapping(raw: PassRaw | null | undefined): string {
  if (raw == null) {
    throw new Error("PASS_RAW_MISSING");
  }
  const slug = cleanString(raw.slug);
  if (!slug) {
    throw new Error("PASS_RAW_INVALID_SLUG");
  }
  return slug;
}

/**
 * Vista mínima y segura cuando no hay datos más que el identificador.
 */
export function emptyPassView(slug: string): PassView {
  const s = cleanString(slug);
  if (!s) {
    throw new Error("PASS_RAW_INVALID_SLUG");
  }
  return {
    slug: s,
    title: s,
    location: {},
    operationalInfo: {},
    alerts: [],
    usefulLinks: [],
    providers: [],
    meta: {},
  };
}

/**
 * RAW → VIEW. No inventa textos ni estado operativo.
 * Arrays: `null`/`undefined` en RAW → `[]` en VIEW donde corresponde.
 */
export function mapPassRawToView(raw: PassRaw): PassView {
  const slug = validatePassRawForMapping(raw);

  const name = cleanString(raw.name);
  const title = name ?? slug;

  const alerts: AlertView[] = (raw.alerts ?? [])
    .map(mapAlert)
    .filter(isNonEmptyAlert);

  const forecastItems = (raw.forecast ?? []).map(mapForecastItem);

  const usefulLinks: LinkView[] = (raw.usefulLinks ?? [])
    .map(mapLink)
    .filter((x): x is LinkView => x != null);

  const providers: ProviderView[] = (raw.providers ?? [])
    .map(mapProvider)
    .filter((x): x is ProviderView => x != null);

  const now = mapWeatherNow(raw.currentWeather);
  const hasWeather = now != null || forecastItems.length > 0;

  return {
    slug,
    title,
    route: raw.routeId != null && Number.isFinite(raw.routeId) ? { routeId: raw.routeId } : undefined,
    location: {
      provinceArgentina: cleanString(raw.provinceAR),
      borderingCountry: cleanString(raw.countryCL),
      localityArgentina: cleanString(raw.localityAR),
      localityBorder: cleanString(raw.localityCL),
      routeDescription: cleanString(raw.routeDescription),
    },
    operationalInfo: {
      schedule: cleanString(raw.schedule),
      scheduleFrom: cleanString(raw.scheduleFrom),
      scheduleTo: cleanString(raw.scheduleTo),
      contact: mapContact(raw.contact),
      gps: mapGps(raw.gps),
    },
    alerts,
    weather: hasWeather
      ? {
          now,
          forecast: forecastItems,
        }
      : undefined,
    usefulLinks,
    providers,
    meta: {
      scrapedAt: cleanString(raw.scrapedAt),
      sourceUrl: cleanString(raw.sourceUrl),
    },
  };
}

/**
 * Si `raw` es `null`/`undefined`, devuelve `emptyPassView(fallbackSlug)` (requiere `fallbackSlug` válido).
 * Si `raw` existe pero `slug` es inválido, lanza (no se inventa slug).
 */
export function mapPassRawToViewSafe(
  raw: PassRaw | null | undefined,
  fallbackSlug: string,
): PassView {
  if (raw == null) {
    return emptyPassView(fallbackSlug);
  }
  return mapPassRawToView(raw);
}
