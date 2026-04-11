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
  /** Texto completo del bloque Atención (scraping). */
  rawText?: string;
}

export interface WeatherNowView {
  description?: string;
  temperatureC?: number;
  /** Sensación térmica si la fuente la envía (p. ej. wttr.in / snapshot). */
  feelsLikeC?: number;
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
  /** Fecha legible si el backend la envía; si no, la UI deriva la fecha del período. */
  date?: string;
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

/** Tweet reciente de @PasoCRMza (RSS); complementario al estado oficial. */
export type PassTweetSentiment = "habilitado" | "cerrado" | "condicionado" | "info";

export interface PassLatestTweet {
  text: string;
  date: string;
  url: string;
  sentiment: PassTweetSentiment;
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
    /** Texto libre de horario (p. ej. API `horario_atencion`). */
    scheduleRaw?: string;
    /** Estado oficial del API (`ABIERTO` / `CERRADO` / `CONDICIONADO`). */
    rawStatus?: string;
    motivo?: string;
    /** Informativo (API `motivo_cierre_extraordinario`); no altera el estado inferido. */
    motivoInfo?: string | null;
    /** Fragmentos “Atención” del HTML de detalle; deduplicados en UI respecto al JSON. */
    htmlAlerts?: string[];
    vialidadEstado?: string;
    vialidadObservaciones?: string;
    /** Ruta nacional (p. ej. `7`) — Vialidad Nacional, informativo. */
    vialidadRuta?: string;
    /** Tramo (p. ej. túnel) — informativo. */
    vialidadTramo?: string;
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
    /** Último tweet relevante de @PasoCRMza (RSS); no sustituye al estado oficial. */
    latestTweet?: PassLatestTweet | null;
    /** Metadatos de fuentes (snapshot persistido). */
    sources?: {
      status: string;
      clima: string;
      statusUpdatedAt?: string | null;
      forecastSource?: string;
    };
    lastKnownGoodAt?: string;
    scrapeError?: string;
    /** Falló la fuente primaria de estado (p. ej. consolidado). */
    operationalStale?: boolean;
  };
}
