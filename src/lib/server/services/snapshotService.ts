import { getPasoBySlug, type PasoConfig } from "@/data/pasos";
import { snapshotFreshMs } from "@/lib/server/config/snapshotPolicy";
import { fetchConsolidado, fetchClima, fetchDetailHTML } from "@/lib/server/apiClient";
import { fetchWttrClimaForPaso } from "@/lib/server/wttrClient";
import { scrapeAguaNegraStatus } from "@/lib/server/aguaNegraScraper";
import { extractAlertsFromDetailHTML } from "@/lib/server/htmlAlertsFromDetail";
import { parseForecastFromHTML } from "@/lib/server/forecastParser";
import {
  extractTimeFromIso,
  isPassSnapshotShape,
  mapToSnapshot,
  weatherSnapshotFromClima,
  type PassSnapshot,
} from "@/lib/server/passMapper";
import { refreshPehuencheSnapshot } from "@/lib/server/pehuencheSnapshot";
import { checkSnapshotFreshness } from "@/lib/server/utils/snapshotFreshnessCheck";
import {
  readPassSnapshot,
  writePassSnapshot,
} from "@/lib/server/storage/passSnapshotStorage";
import type { PassRaw } from "@/types/pass-raw";

const GOV_AR = "https://www.argentina.gob.ar/seguridad/pasosinternacionales";

/** En producción, si el JSON tiene más de esto, se intenta refrescar desde la API. */
const SNAPSHOT_STALE_MAX_MINUTES = 120;

/** Error interno cuando no hay snapshot persistido y el scrape en vivo también falla (no mostrar al usuario). */
export const PASS_DATA_UNAVAILABLE = "PASS_DATA_UNAVAILABLE";

/** Solo entorno local (no build ni runtime en Vercel). */
function isDevRuntime(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function isVercelEnv(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.VERCEL);
}

function allowLiveScrape(): boolean {
  return isDevRuntime() && !isVercelEnv();
}

function snapshotAgeMs(scrapedAt: string): number {
  const t = new Date(scrapedAt).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

function isFresh(snapshot: PassRaw | PassSnapshot, maxAgeMs: number): boolean {
  const at = snapshot.scrapedAt?.trim();
  if (!at) return false;
  return snapshotAgeMs(at) < maxAgeMs;
}

/** Lee el último snapshot (Redis si hay hit, si no archivo en `public/snapshots`). */
export async function readPersistedSnapshot(slug: string): Promise<PassRaw | PassSnapshot | null> {
  return readPassSnapshot(slug);
}

/**
 * Agua Negra: estado solo desde San Juan; clima wttr.in (fallback SMN); pronóstico wttr o HTML ruta/27;
 * vialidad desde San Juan o, si falta, solo bloque vialidad de Argentina.gob.ar (nunca rawStatus desde AR).
 */
async function refreshAguaNegraFromSanJuan(cfg: PasoConfig): Promise<PassSnapshot> {
  console.log("\n[snapshot] === AGUA NEGRA (San Juan + fallbacks) ===");
  const prevRaw = await readPassSnapshot(cfg.slug);
  const prev = prevRaw && isPassSnapshotShape(prevRaw) ? prevRaw : null;

  const sjData = await scrapeAguaNegraStatus();
  const scrapedAt = new Date().toISOString();
  const statusFailed = Boolean(sjData.scrapeError);

  let wttr: Awaited<ReturnType<typeof fetchWttrClimaForPaso>> = null;
  if (cfg.wttrQuery) {
    wttr = await fetchWttrClimaForPaso(cfg.wttrQuery, cfg.lat, cfg.lng);
  }

  let weather: PassSnapshot["weather"] = null;
  let forecast = wttr?.forecast ?? [];
  let climaLabel = "sin_datos";
  let forecastSource: string | undefined;

  if (!statusFailed) {
    if (wttr) {
      const temp = wttr.clima.temperatura;
      const windStr =
        temp.wind.direction === "Calma" || temp.wind.speed == null || temp.wind.speed === 0
          ? "Calma"
          : `${temp.wind.direction} a ${temp.wind.speed} km/h`;
      weather = {
        temperatureC: Number.isFinite(temp.temperature) ? temp.temperature : null,
        description: temp.weather?.description?.trim() ?? null,
        wind: windStr,
        visibilityKm: Number.isFinite(temp.visibility) ? temp.visibility : null,
        sunrise: extractTimeFromIso(wttr.clima.salida_sol),
        sunset: extractTimeFromIso(wttr.clima.puesta_sol),
        updatedAt: temp.date?.trim() ?? null,
        feelsLikeC:
          temp.feels_like != null && Number.isFinite(temp.feels_like) ? temp.feels_like : null,
        humidity: Number.isFinite(temp.humidity) ? temp.humidity : null,
      };
      climaLabel = "https://wttr.in";
    } else {
      console.warn("[snapshot] wttr.in falló para agua-negra — intentando SMN");
      try {
        const smn = await fetchClima(String(cfg.lat), String(cfg.lng));
        weather = weatherSnapshotFromClima(smn);
        climaLabel = `${GOV_AR}/detalle_clima/${cfg.lat}/${cfg.lng}`;
      } catch {
        weather = null;
      }
    }
  }

  if (!statusFailed && forecast.length === 0) {
    try {
      const htmlArg = await fetchDetailHTML(27, "Agua-Negra");
      const fromHtml = parseForecastFromHTML(htmlArg);
      if (fromHtml.length) {
        forecast = fromHtml;
        forecastSource = `${GOV_AR}/detalle/ruta/27/Agua-Negra`;
      }
    } catch {
      /* ignore */
    }
  }

  let vialidadRuta = sjData.vialidadRuta?.replace(/^RN\s+/i, "").trim() ?? "";
  let vialidadTramo = "";
  let vialidadEstado = sjData.vialidadEstado?.trim() || "";
  let vialidadObservaciones = sjData.vialidadObs?.trim() ?? "";

  if (!vialidadEstado || vialidadEstado === "") {
    try {
      const cons = await fetchConsolidado(27);
      const v = cons.vialidad;
      if (!vialidadRuta && typeof v.ruta === "string") vialidadRuta = v.ruta.trim();
      if (!vialidadEstado && typeof v.estado === "string") vialidadEstado = v.estado.trim();
      if (!vialidadTramo && typeof v.tramo === "string") vialidadTramo = v.tramo.trim();
      if (!vialidadObservaciones) vialidadObservaciones = v.observaciones?.trim() ?? "";
    } catch {
      /* ignore */
    }
  }

  const htmlAlerts: string[] = [];
  if (!statusFailed) {
    if (sjData.statusDetail?.trim()) htmlAlerts.push(sjData.statusDetail.trim());
    if (sjData.scheduleDays?.trim()) {
      htmlAlerts.push(`Días de apertura: ${sjData.scheduleDays.trim()}`);
    }
    if (sjData.restriccionPasajeros?.trim()) htmlAlerts.push(sjData.restriccionPasajeros.trim());
    if (sjData.restriccionVelocidad?.trim()) {
      htmlAlerts.push(`Velocidad ${sjData.restriccionVelocidad.trim()}`);
    }
  }
  const htmlAlertsFiltered = htmlAlerts.filter((x) => x.trim().length > 8);

  const lastKnownGoodAt =
    !statusFailed && sjData.rawStatus !== "SIN_DATOS"
      ? scrapedAt
      : prev?.lastKnownGoodAt ??
        (prev?.rawStatus && prev.rawStatus !== "SIN_DATOS" ? prev.scrapedAt : undefined);

  const snapshot: PassSnapshot = {
    slug: cfg.slug,
    name: cfg.name,
    schedule: sjData.scheduleNormalized,
    scheduleRaw: sjData.scheduleText?.trim() || sjData.scheduleDays?.trim() || "",
    rawStatus: sjData.rawStatus,
    statusDetail: sjData.statusDetail,
    scheduleText: sjData.scheduleText,
    scheduleDays: sjData.scheduleDays,
    motivo: null,
    motivoInfo: null,
    htmlAlerts: htmlAlertsFiltered.length ? htmlAlertsFiltered : undefined,
    vialidadRuta,
    vialidadTramo,
    vialidadEstado,
    vialidadObservaciones,
    restriccionPasajeros: statusFailed ? null : sjData.restriccionPasajeros,
    restriccionVelocidad: statusFailed ? null : sjData.restriccionVelocidad,
    latestTweet: null,
    weather: statusFailed ? null : weather,
    contact: null,
    lat: cfg.lat,
    lng: cfg.lng,
    altitudeM: cfg.altitudeM,
    scrapedAt,
    forecast: statusFailed ? [] : forecast,
    sources: {
      status: "aguanegra.sanjuan.gob.ar",
      clima: climaLabel,
      statusUpdatedAt: sjData.statusUpdatedAt,
      ...(forecastSource ? { forecastSource } : {}),
    },
    scrapeError: sjData.scrapeError ?? undefined,
    lastKnownGoodAt,
  };

  await writePassSnapshot(cfg.slug, snapshot);
  console.log(
    `[snapshot] agua-negra ✅ status=${snapshot.rawStatus} | temp=${snapshot.weather?.temperatureC ?? "—"}°C | schedule=${snapshot.schedule}`,
  );
  return snapshot;
}

/**
 * Obtiene datos del API oficial y persiste cuando el filesystem es escribible (local / CI).
 */
export async function refreshAndPersistSnapshot(slug: string): Promise<PassSnapshot> {
  const cfg = getPasoBySlug(slug);
  if (!cfg?.active) {
    throw new Error("UNKNOWN_SLUG");
  }

  if (slug === "agua-negra") {
    return refreshAguaNegraFromSanJuan(cfg);
  }

  if (slug === "pehuenche") {
    const snap = await refreshPehuencheSnapshot(cfg);
    await writePassSnapshot(slug, snap);
    return snap;
  }

  const [consolidado, htmlDetail] = await Promise.all([
    fetchConsolidado(cfg.routeId),
    fetchDetailHTML(cfg.routeId, cfg.routeSlug),
  ]);

  const forecastFromHtml = parseForecastFromHTML(htmlDetail);
  const htmlAlerts = extractAlertsFromDetailHTML(htmlDetail);

  let clima: Awaited<ReturnType<typeof fetchClima>>;
  let forecast = forecastFromHtml;

  if (cfg.climaSource === "wttr" && cfg.wttrQuery) {
    console.log(`[snapshot] 🌤 wttr.in para ${cfg.slug}…`);
    const wttr = await fetchWttrClimaForPaso(cfg.wttrQuery, cfg.lat, cfg.lng);
    if (wttr) {
      const t = wttr.clima.temperatura.temperature;
      const desc = wttr.clima.temperatura.weather?.description;
      console.log(
        `[snapshot] ✅ wttr OK ${cfg.slug}: ${t}°C ${desc ?? ""} — forecast ${wttr.forecast.length} ítems`,
      );
      clima = wttr.clima;
      forecast = wttr.forecast.length ? wttr.forecast : forecastFromHtml;
    } else {
      console.warn(`[snapshot] ⚠️ wttr falló para ${cfg.slug}, usando SMN`);
      clima = await fetchClima(String(cfg.lat), String(cfg.lng));
    }
  } else {
    clima = await fetchClima(String(cfg.lat), String(cfg.lng));
  }

  const snapshot = mapToSnapshot(cfg, consolidado, clima, forecast, { htmlAlerts });

  await writePassSnapshot(slug, snapshot);
  return snapshot;
}

/**
 * Producción / Vercel: solo lee `public/snapshots/{slug}.json`.
 * Desarrollo local: puede refrescar desde el API si falta el archivo o está vencido.
 */
export async function getSnapshotForApi(slug: string): Promise<PassRaw | PassSnapshot> {
  const cfg = getPasoBySlug(slug);
  if (!cfg?.active) {
    throw new Error("UNKNOWN_SLUG");
  }

  const persisted = await readPassSnapshot(slug);

  if (persisted) {
    checkSnapshotFreshness(persisted);
  }

  if (allowLiveScrape()) {
    if (!persisted) {
      return refreshAndPersistSnapshot(slug);
    }
    if (!isFresh(persisted, snapshotFreshMs)) {
      try {
        return await refreshAndPersistSnapshot(slug);
      } catch {
        return persisted;
      }
    }
    return persisted;
  }

  if (persisted) {
    const at = persisted.scrapedAt?.trim();
    if (at) {
      const ageMin = snapshotAgeMs(at) / 60000;
      if (ageMin > SNAPSHOT_STALE_MAX_MINUTES) {
        console.warn(
          `[snapshot] ${slug} tiene ${Math.round(ageMin)} min — intentando live scrape`,
        );
        try {
          return await refreshAndPersistSnapshot(slug);
        } catch (e) {
          console.error(`[snapshot] Live scrape falló para ${slug}:`, e);
          return persisted;
        }
      }
    }
    return persisted;
  }

  console.warn(
    `[snapshot] No persisted snapshot for "${slug}" (missing from deploy or repo); attempting live scrape...`,
  );
  try {
    return await refreshAndPersistSnapshot(slug);
  } catch (e) {
    console.error(`[snapshot] Live scrape failed for "${slug}":`, e);
    throw new Error(PASS_DATA_UNAVAILABLE);
  }
}

/** Alias del flujo de refresh en vivo + persistencia unificada. */
export { refreshAndPersistSnapshot as refreshPassSnapshot };
