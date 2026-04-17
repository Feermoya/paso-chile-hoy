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
  /**
   * Boletín / texto extendido (p. ej. Prensa Mendoza). Opcional; ingestión manual o futura.
   * Solo lo usa el motor de riesgo de Cristo Redentor.
   */
  extendedForecastText?: string;
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

function numFromUnknown(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Mapea la respuesta de `/detalle_clima/{lat}/{lng}` (estructura anidada o variantes).
 * No lanza: ante formato desconocido devuelve campos null y opcionalmente avisa en DEBUG_PASS.
 */
export function weatherSnapshotFromClima(clima: ClimaResponse): WeatherSnapshot {
  const root = clima as unknown as Record<string, unknown>;

  let tempBlock: Record<string, unknown> = {};
  const tRoot = root.temperatura;
  if (tRoot && typeof tRoot === "object" && !Array.isArray(tRoot)) {
    tempBlock = tRoot as Record<string, unknown>;
  } else if (Array.isArray(root.datos) && root.datos[0] && typeof root.datos[0] === "object") {
    tempBlock = root.datos[0] as Record<string, unknown>;
  }

  const temperatureC =
    numFromUnknown(tempBlock.temperature) ??
    numFromUnknown(tempBlock.temperatura) ??
    numFromUnknown(root.temperature) ??
    numFromUnknown(root.temp);

  const weatherSub =
    tempBlock.weather && typeof tempBlock.weather === "object"
      ? (tempBlock.weather as Record<string, unknown>)
      : null;
  const descriptionRaw =
    typeof weatherSub?.description === "string"
      ? weatherSub.description.trim()
      : typeof tempBlock.descripcion === "string"
        ? tempBlock.descripcion.trim()
        : typeof root.descripcion === "string"
          ? (root.descripcion as string).trim()
          : null;
  const description = descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;

  let windDir = "Calma";
  let windSpeed: number | null = null;
  const w = tempBlock.wind;
  if (typeof w === "string" && w.trim()) {
    windDir = w.trim();
  } else if (w && typeof w === "object") {
    const wo = w as Record<string, unknown>;
    const d = wo.direction;
    if (typeof d === "string" && d.trim()) windDir = d.trim();
    windSpeed = numFromUnknown(wo.speed);
  }

  const windStr =
    windDir === "Calma" || windSpeed == null || windSpeed === 0
      ? "Calma"
      : `${windDir} ${windSpeed} km/h`;

  const visibilityKm =
    numFromUnknown(tempBlock.visibility) ??
    numFromUnknown(tempBlock.visibilidad) ??
    numFromUnknown(root.visibility);

  const salidaSol = typeof root.salida_sol === "string" ? root.salida_sol : null;
  const puestaSol = typeof root.puesta_sol === "string" ? root.puesta_sol : null;

  const dateStr =
    typeof tempBlock.date === "string" && tempBlock.date.trim()
      ? tempBlock.date.trim()
      : typeof tempBlock.fecha === "string" && tempBlock.fecha.trim()
        ? (tempBlock.fecha as string).trim()
        : null;

  const feelsRaw = numFromUnknown(tempBlock.feels_like) ?? numFromUnknown(tempBlock.sensacion);
  const humidityRaw = numFromUnknown(tempBlock.humidity) ?? numFromUnknown(tempBlock.humedad);

  const out: WeatherSnapshot = {
    temperatureC,
    description,
    wind: windStr,
    visibilityKm,
    sunrise: extractTimeFromIso(salidaSol),
    sunset: extractTimeFromIso(puestaSol),
    updatedAt: dateStr,
    feelsLikeC: feelsRaw != null && Number.isFinite(feelsRaw) ? feelsRaw : null,
    humidity: humidityRaw != null && Number.isFinite(humidityRaw) ? humidityRaw : null,
  };

  if (
    typeof process !== "undefined" &&
    process.env.DEBUG_PASS === "true" &&
    temperatureC == null &&
    description == null
  ) {
    console.warn("[passMapper] clima: no se pudo extraer temperatura ni descripción", {
      keys: Object.keys(root),
      temperaturaKeys:
        tRoot && typeof tRoot === "object" && !Array.isArray(tRoot)
          ? Object.keys(tRoot as object)
          : [],
    });
  }

  return out;
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
