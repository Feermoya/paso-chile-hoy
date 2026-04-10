/**
 * Modelo VIEW: contrato estable para la UI.
 *
 * - Sin campo de “estado del paso” (abierto/cerrado): no es dato confiable del HTML analizado.
 * - Arrays siempre definidos donde el mapper los normaliza (vacíos si no hay datos).
 * - Strings opcionales: `undefined` si no hay valor (no cadenas vacías).
 */

export interface ContactView {
  phone?: string;
  telHref?: string;
}

export interface GpsView {
  lat?: number;
  lng?: number;
  /** Enlace geo: o equivalente para abrir en mapas */
  openInMapsHref?: string;
}

export interface AlertView {
  source?: string;
  title?: string;
  description?: string;
  detail?: string;
}

export interface WeatherNowView {
  description?: string;
  temperatureC?: number;
  wind?: string;
  visibilityKm?: number;
  visibilityText?: string;
  sunrise?: string;
  sunset?: string;
  /** Metadato de tiempo en fuente (p. ej. datetime SMN), sin interpretación. */
  providerNote?: string;
}

export interface ForecastItemView {
  period?: string;
  description?: string;
  temperatureC?: number;
  wind?: string;
  visibility?: string;
}

export interface LinkView {
  text: string;
  url?: string;
}

export interface ProviderView {
  name: string;
  lastUpdated?: string;
  lastUpdatedRaw?: string;
}

export interface PassView {
  slug: string;
  /** Título principal para UI; cae back a `slug` si no hay nombre */
  title: string;

  route?: {
    routeId?: number;
  };

  location: {
    provinceArgentina?: string;
    borderingCountry?: string;
    localityArgentina?: string;
    localityBorder?: string;
    routeDescription?: string;
  };

  operationalInfo: {
    schedule?: string;
    scheduleFrom?: string;
    scheduleTo?: string;
    contact?: ContactView;
    gps?: GpsView;
  };

  /** Siempre array (vacío si no hubo alertas en RAW) */
  alerts: AlertView[];

  /** Clima: todo opcional; forecast siempre array dentro de weather si weather existe */
  weather?: {
    now?: WeatherNowView;
    forecast: ForecastItemView[];
  };

  usefulLinks: LinkView[];
  providers: ProviderView[];

  meta: {
    scrapedAt?: string;
    sourceUrl?: string;
  };
}
