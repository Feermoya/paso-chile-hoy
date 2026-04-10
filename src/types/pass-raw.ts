/**
 * Modelo RAW: refleja lo que puede existir tras el scraping / snapshot persistido.
 * Todo es opcional salvo `slug` (obligatorio en runtime al validar antes del mapper).
 *
 * No incluye “estado operativo” (abierto/cerrado) como dato fiable del HTML oficial.
 */

export interface ContactRaw {
  phone?: string;
  /** href del enlace `tel:` */
  telHref?: string;
}

export interface GpsRaw {
  lat?: number;
  lng?: number;
  /** p. ej. `geo:-32.8211,-69.9232` */
  geoHref?: string;
}

/** Bloque “Atención” / alertas de la página (0..N). */
export interface AlertRaw {
  /** p. ej. “Vialidad Nacional informa:” → “Vialidad Nacional” */
  source?: string;
  /** p. ej. “Atención” */
  title?: string;
  /** Texto principal (suele ir en strong) */
  description?: string;
  /** Texto complementario (párrafos siguientes, p. ej. “Apertura demorada…”) */
  detail?: string;
  /** Texto completo del bloque (inferencia de estado / búsqueda de keywords). */
  rawText?: string;
}

export interface WeatherNowRaw {
  description?: string;
  temperatureC?: number;
  wind?: string;
  visibilityKm?: number;
  /** Cuando la visibilidad no es numérica (p. ej. “Muy buena”) */
  visibilityText?: string;
  sunrise?: string;
  sunset?: string;
  /** Metadato SMN u origen si se conserva en bruto */
  providerNote?: string;
}

export interface ForecastItemRaw {
  period?: string;
  description?: string;
  temperatureC?: number;
  wind?: string;
  /** Texto libre: “Buena”, “Muy mala”, etc. */
  visibility?: string;
}

export interface LinkRaw {
  text?: string;
  url?: string;
}

export interface ProviderRaw {
  name?: string;
  /** Fecha/hora tal como aparece en el HTML */
  lastUpdatedRaw?: string;
  /** ISO 8601 si se pudo normalizar en ingestión */
  lastUpdated?: string;
}

/**
 * Snapshot “rico” alineado al HTML real de pasos internacionales (Argentina.gob.ar).
 * Los nombres priorizan claridad sobre el acoplamiento al DOM.
 */
export interface PassRaw {
  /** Identificador estable del proyecto (config), no el slug de URL del sitio si difiere. */
  slug: string;

  /** id de ruta en URL `/detalle/ruta/{routeId}/...` si se conoce */
  routeId?: number;

  /** Nombre visible del paso (p. ej. “Paso Sistema Cristo Redentor”) */
  name?: string;

  localityAR?: string;
  localityCL?: string;

  provinceAR?: string;
  countryCL?: string;

  /** Tramo / descripción de ruta en una sola cadena si no se separó en localidades */
  routeDescription?: string;

  /** Horario tal cual en página (puede ser “09:00-21:00”, “24 hs”, “cerrado (siempre).”, etc.) */
  schedule?: string;
  scheduleFrom?: string;
  scheduleTo?: string;

  contact?: ContactRaw;
  gps?: GpsRaw;

  alerts?: AlertRaw[];
  currentWeather?: WeatherNowRaw;
  forecast?: ForecastItemRaw[];
  usefulLinks?: LinkRaw[];
  providers?: ProviderRaw[];

  /** Momento UTC del scraping / serialización del snapshot */
  scrapedAt?: string;

  /** URL canónica de la página fuente */
  sourceUrl?: string;
}
