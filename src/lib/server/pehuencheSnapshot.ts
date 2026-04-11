/**
 * Snapshot Paso Pehuenche: consolidado + clima + HTML con manejo de fallos parciales.
 */
import type { PasoConfig } from "@/data/pasos";
import type { ClimaResponse, ConsolidadoResponse } from "@/lib/types/apiTypes";
import { fetchClima, fetchConsolidado, fetchDetailHTML } from "@/lib/server/apiClient";
import { extractAlertsFromDetailHTML } from "@/lib/server/htmlAlertsFromDetail";
import { parseForecastFromHTML } from "@/lib/server/forecastParser";
import { isPassSnapshotShape, mapToSnapshot, type PassSnapshot } from "@/lib/server/passMapper";
import { readPassSnapshot } from "@/lib/server/storage/passSnapshotStorage";

const GOV_AR = "https://www.argentina.gob.ar/seguridad/pasosinternacionales";

function makeEmptyClima(): ClimaResponse {
  return {
    temperatura: {
      date: "",
      humidity: 0,
      pressure: 0,
      feels_like: null,
      temperature: NaN,
      visibility: NaN,
      weather: { description: "", id: 0 },
      wind: { direction: "Calma", deg: null, speed: null },
      station_id: 0,
      location: {
        id: 0,
        name: "",
        department: "",
        province: "",
        type: "",
        coord: { lon: 0, lat: 0 },
        distance: 0,
      },
    },
    puesta_sol: "",
    salida_sol: "",
  };
}

function priorLastKnownGood(prev: PassSnapshot | null): string | undefined {
  if (!prev) return undefined;
  if (
    prev.rawStatus &&
    prev.rawStatus !== "SIN_DATOS" &&
    !prev.scrapeError &&
    prev.operationalStale !== true
  ) {
    return prev.scrapedAt;
  }
  return prev.lastKnownGoodAt;
}

export async function refreshPehuencheSnapshot(cfg: PasoConfig): Promise<PassSnapshot> {
  const prevRaw = await readPassSnapshot(cfg.slug);
  const prev = prevRaw && isPassSnapshotShape(prevRaw) ? prevRaw : null;
  const lastKnownGood = priorLastKnownGood(prev);

  const settled = await Promise.allSettled([
    fetchConsolidado(cfg.routeId),
    fetchClima(String(cfg.lat), String(cfg.lng)),
    fetchDetailHTML(cfg.routeId, cfg.routeSlug),
  ]);

  let consolidado: ConsolidadoResponse | null = null;
  let clima: ClimaResponse | null = null;
  let htmlDetail: string | null = null;
  const failed: string[] = [];

  if (settled[0].status === "fulfilled") consolidado = settled[0].value;
  else failed.push("detalle_consolidado");
  if (settled[1].status === "fulfilled") clima = settled[1].value;
  else failed.push("detalle_clima");
  if (settled[2].status === "fulfilled") htmlDetail = settled[2].value;
  else failed.push("detalle_html");

  const scrapedAt = new Date().toISOString();

  if (!consolidado) {
    return {
      slug: cfg.slug,
      name: prev?.name ?? cfg.name,
      schedule: prev?.schedule ?? null,
      scheduleRaw: prev?.scheduleRaw ?? "",
      rawStatus: "SIN_DATOS",
      motivo: null,
      motivoInfo: null,
      htmlAlerts: [],
      vialidadRuta: prev?.vialidadRuta ?? "",
      vialidadTramo: prev?.vialidadTramo ?? "",
      vialidadEstado: prev?.vialidadEstado ?? "",
      vialidadObservaciones: prev?.vialidadObservaciones ?? "",
      latestTweet: null,
      weather: null,
      contact: prev?.contact ?? null,
      lat: cfg.lat,
      lng: cfg.lng,
      altitudeM: cfg.altitudeM,
      scrapedAt,
      forecast: [],
      sources: {
        status: `${GOV_AR}/detalle_consolidado/ruta/${cfg.routeId}`,
        clima: `${GOV_AR}/detalle_clima/${cfg.lat}/${cfg.lng}`,
        statusUpdatedAt: null,
      },
      scrapeError: failed.join(", "),
      lastKnownGoodAt: lastKnownGood,
      operationalStale: true,
    };
  }

  const forecast = htmlDetail ? parseForecastFromHTML(htmlDetail) : [];
  const htmlAlertsRaw = htmlDetail ? extractAlertsFromDetailHTML(htmlDetail) : [];
  const htmlAlerts = htmlAlertsRaw.filter((x) => typeof x === "string" && x.trim().length > 8);

  const snap = mapToSnapshot(cfg, consolidado, clima ?? makeEmptyClima(), htmlDetail ? forecast : [], {
    htmlAlerts: htmlDetail ? htmlAlerts : [],
  });

  const apiEstado = (consolidado.detalle.estado.estado ?? "").trim();
  snap.rawStatus = apiEstado || "SIN_DATOS";

  const la = parseFloat(String(consolidado.detalle.latitud ?? "").replace(",", "."));
  const lo = parseFloat(String(consolidado.detalle.longitud ?? "").replace(",", "."));
  if (Number.isFinite(la)) snap.lat = la;
  if (Number.isFinite(lo)) snap.lng = lo;

  snap.sources = {
    status: `${GOV_AR}/detalle_consolidado/ruta/${cfg.routeId}`,
    clima: `${GOV_AR}/detalle_clima/${cfg.lat}/${cfg.lng}`,
    statusUpdatedAt: consolidado.detalle.estado.ultima_actualizacion?.trim() || null,
  };

  if (!clima) {
    snap.weather = null;
  }

  if (!htmlDetail) {
    snap.forecast = [];
    snap.htmlAlerts = [];
  }

  const partialOnly = failed.filter((f) => f !== "detalle_consolidado");
  snap.scrapeError = partialOnly.length ? partialOnly.join(", ") : undefined;
  snap.operationalStale = false;

  snap.lastKnownGoodAt = snap.rawStatus !== "SIN_DATOS" ? scrapedAt : lastKnownGood;

  snap.scrapedAt = scrapedAt;

  return snap;
}
