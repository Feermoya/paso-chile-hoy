import { buildArgentinaPassSourceUrl, type PasoConfig } from "@/data/pasos";
import { shouldFilterMotivoFragment } from "@/utils/motivoFilters";
import type { ForecastPeriod } from "@/lib/server/forecastParser";
import type { ClimaResponse, ConsolidadoResponse } from "@/lib/types/apiTypes";
import type { ForecastItemView, PassLatestTweet, PassView } from "@/types/pass-view";

export type { ForecastPeriod } from "@/lib/server/forecastParser";

/** Bloque clima en snapshot (null = fuente falló o no aplica en este scrape). */
export type WeatherSnapshot = {
  temperatureC: number | null;
  description: string | null;
  wind: string | null;
  visibilityKm: number | null;
  sunrise: string | null;
  sunset: string | null;
  updatedAt: string | null;
  feelsLikeC?: number | null;
  humidity?: number | null;
};

/** Snapshot persistido en `public/snapshots/{slug}.json` (API oficial). */
export interface PassSnapshot {
  slug: string;
  name: string;
  schedule: string | null;
  scheduleRaw: string;
  rawStatus: string;
  /** Detalle operativo (p. ej. San Juan: “Cerrado para egreso”). */
  statusDetail?: string | null;
  /** Horario legible tal como en la fuente (p. ej. “09:00 a 17:00 hs”). */
  scheduleText?: string | null;
  /** Texto de días de apertura desde la fuente regional. */
  scheduleDays?: string | null;
  motivo: string | null;
  vialidadRuta: string;
  vialidadTramo: string;
  vialidadEstado: string;
  vialidadObservaciones: string;
  restriccionPasajeros?: string | null;
  restriccionVelocidad?: string | null;
  /** Origen de datos por bloque (p. ej. Agua Negra: San Juan + wttr.in). */
  sources?: {
    status: string;
    clima: string;
    statusUpdatedAt?: string | null;
    forecastSource?: string;
  };
  /** Complementario (RSS @PasoCRMza); no define el estado del paso. */
  latestTweet: PassLatestTweet | null;
  weather: WeatherSnapshot | null;
  contact: string | null;
  lat: number;
  lng: number;
  altitudeM: number;
  scrapedAt: string;
  /** Pronóstico 24 h desde el HTML de detalle. */
  forecast: ForecastPeriod[];
  /** Informativo (p. ej. horario de atención); no afecta inferPassStatus. */
  motivoInfo?: string | null;
  /** Alertas crudas extraídas del HTML de detalle (complemento al JSON). */
  htmlAlerts?: string[];
  /** Error de red/parsing en este scrape (no reutilizar estado como vigente). */
  scrapeError?: string;
  /** Último scrape con estado operativo confiable (ISO). */
  lastKnownGoodAt?: string;
  /** true si falló detalle_consolidado (Pehuenche) u operación equivalente. */
  operationalStale?: boolean;
}

/** Snapshots antiguos pueden traer `motivoExtra` en lugar de `motivoInfo`. */
export type SnapshotJson = PassSnapshot & { motivoExtra?: string | null };

export type MapToSnapshotOptions = {
  htmlAlerts?: string[];
};

export function isPassSnapshotShape(o: unknown): o is PassSnapshot {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.slug === "string" &&
    typeof r.rawStatus === "string" &&
    typeof r.scrapedAt === "string" &&
    (r.weather === null || typeof r.weather === "object") &&
    typeof r.vialidadEstado === "string"
  );
}

export function extractTimeFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

export function weatherSnapshotFromClima(clima: ClimaResponse): WeatherSnapshot {
  const temp = clima.temperatura;
  const windStr =
    temp.wind.direction === "Calma" || temp.wind.speed == null || temp.wind.speed === 0
      ? "Calma"
      : `${temp.wind.direction} ${temp.wind.speed} km/h`;
  return {
    temperatureC: Number.isFinite(temp.temperature) ? temp.temperature : null,
    description: temp.weather?.description?.trim() ?? null,
    wind: windStr,
    visibilityKm: Number.isFinite(temp.visibility) ? temp.visibility : null,
    sunrise: extractTimeFromIso(clima.salida_sol),
    sunset: extractTimeFromIso(clima.puesta_sol),
    updatedAt: temp.date?.trim() ?? null,
    feelsLikeC:
      temp.feels_like != null && Number.isFinite(temp.feels_like) ? temp.feels_like : null,
    humidity: Number.isFinite(temp.humidity) ? temp.humidity : null,
  };
}

function contactFromString(contact: string | null): { phone: string; telHref: string } | undefined {
  if (!contact?.trim()) return undefined;
  const phone = contact.trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return { phone, telHref: `tel:${encodeURIComponent(phone)}` };
  const href = digits.startsWith("54") ? `tel:+${digits}` : `tel:+54${digits}`;
  return { phone, telHref: href };
}

function parseScheduleBounds(schedule: string | null): { from?: string; to?: string } {
  if (!schedule?.trim()) return {};
  const m = schedule.trim().match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) return {};
  return { from: `${m[1].padStart(2, "0")}:${m[2]}`, to: `${m[3].padStart(2, "0")}:${m[4]}` };
}

export function mapToSnapshot(
  paso: PasoConfig,
  consolidado: ConsolidadoResponse,
  clima: ClimaResponse,
  forecast: ForecastPeriod[] = [],
  options: MapToSnapshotOptions = {},
): PassSnapshot {
  const det = consolidado.detalle;
  const est = det.estado;
  const vial = consolidado.vialidad;

  const motivo =
    [est.motivo_cierre, est.motivo_demora, est.observaciones, est.demoras]
      .map((s) => s?.trim())
      .filter((s) => Boolean(s) && !shouldFilterMotivoFragment(s))
      .join(" · ")
      .trim() || null;

  const rawMotivoInfo = est.motivo_cierre_extraordinario?.trim();
  const motivoInfo =
    rawMotivoInfo && rawMotivoInfo !== "-.-" && rawMotivoInfo.length > 3 ? rawMotivoInfo : null;

  const htmlAlerts = Array.isArray(options.htmlAlerts)
    ? options.htmlAlerts.filter((x) => typeof x === "string" && x.trim().length > 8)
    : [];

  const fechaSchema = det.fecha_schema?.trim() || null;

  return {
    slug: paso.slug,
    name: det.nombre,
    schedule: fechaSchema,
    scheduleRaw: typeof det.horario_atencion === "string" ? det.horario_atencion : "",
    rawStatus: est.estado,
    motivo,
    motivoInfo,
    htmlAlerts,
    vialidadRuta: typeof vial.ruta === "string" ? vial.ruta.trim() : "",
    vialidadTramo: typeof vial.tramo === "string" ? vial.tramo.trim() : "",
    vialidadEstado: typeof vial.estado === "string" ? vial.estado.trim() : "",
    vialidadObservaciones: vial.observaciones?.trim() ?? "",
    latestTweet: null,
    weather: weatherSnapshotFromClima(clima),
    contact: det.contacto?.trim() || null,
    lat: paso.lat,
    lng: paso.lng,
    altitudeM: paso.altitudeM,
    scrapedAt: new Date().toISOString(),
    forecast,
  };
}

export function mapPassSnapshotToView(snapshot: PassSnapshot, paso: PasoConfig): PassView {
  const snap = snapshot as SnapshotJson;
  const motivoInfoResolved = snap.motivoInfo ?? snap.motivoExtra ?? undefined;
  const bounds = parseScheduleBounds(snapshot.schedule);
  const contact = contactFromString(snapshot.contact);
  const w = snapshot.weather;

  const sourceUrl =
    snap.sources?.status === "aguanegra.sanjuan.gob.ar"
      ? "https://aguanegra.sanjuan.gob.ar/estado-del-paso"
      : buildArgentinaPassSourceUrl(paso);

  const forecastItems: ForecastItemView[] = (snapshot.forecast ?? []).map((f) => ({
    period: f.period,
    description: f.description,
    temperatureC: f.temperatureC,
    wind: f.wind ?? undefined,
    visibility: f.visibility ?? undefined,
  }));

  const now =
    w != null
      ? {
          description: w.description ?? undefined,
          temperatureC: w.temperatureC ?? undefined,
          feelsLikeC:
            w.feelsLikeC != null && Number.isFinite(w.feelsLikeC) ? w.feelsLikeC : undefined,
          wind: w.wind ?? undefined,
          visibilityKm: w.visibilityKm ?? undefined,
          sunrise: w.sunrise ?? undefined,
          sunset: w.sunset ?? undefined,
          providerNote: w.updatedAt ?? undefined,
        }
      : null;

  const hasNow =
    now != null &&
    (Boolean(now.description) ||
      now.temperatureC != null ||
      now.feelsLikeC != null ||
      Boolean(now.wind) ||
      now.visibilityKm != null ||
      Boolean(now.sunrise) ||
      Boolean(now.sunset) ||
      Boolean(now.providerNote));

  const hasWeatherBlock = hasNow || forecastItems.length > 0;

  const scheduleLine =
    snapshot.schedule ? `Horario: ${snapshot.schedule} h` : undefined;

  return {
    slug: snapshot.slug,
    title: snapshot.name || paso.name,
    route: { routeId: paso.routeId },
    location: {
      provinceArgentina: paso.provinceAR,
      borderingCountry: "Chile",
      localityArgentina: paso.localityAR,
      localityBorder: paso.localityCL,
      routeDescription: undefined,
    },
    operationalInfo: {
      schedule: scheduleLine,
      scheduleFrom: bounds.from,
      scheduleTo: bounds.to,
      scheduleRaw: snapshot.scheduleRaw,
      rawStatus: snapshot.rawStatus,
      motivo: snapshot.motivo ?? undefined,
      motivoInfo: motivoInfoResolved,
      ...(snapshot.htmlAlerts && snapshot.htmlAlerts.length > 0
        ? { htmlAlerts: [...snapshot.htmlAlerts] }
        : {}),
      vialidadEstado: snapshot.vialidadEstado,
      vialidadObservaciones: snapshot.vialidadObservaciones,
      vialidadRuta: snapshot.vialidadRuta ?? "",
      vialidadTramo: snapshot.vialidadTramo ?? "",
      contact,
      gps: {
        lat: paso.lat,
        lng: paso.lng,
        openInMapsHref: `geo:${paso.lat},${paso.lng}`,
      },
    },
    alerts: [],
    weather: hasWeatherBlock ? { now: hasNow ? now! : undefined, forecast: forecastItems } : undefined,
    usefulLinks: [],
    providers: [],
    meta: {
      scrapedAt: snapshot.scrapedAt,
      sourceUrl,
      latestTweet: snapshot.latestTweet ?? null,
      sources: snapshot.sources,
      lastKnownGoodAt: snapshot.lastKnownGoodAt,
      scrapeError: snapshot.scrapeError,
      operationalStale: snapshot.operationalStale === true,
    },
  };
}
