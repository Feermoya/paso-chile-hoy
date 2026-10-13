import type { LasLenasSnapshot } from "@/types/las-lenas";
import { formatRelativeTimeAgo } from "@/utils/formatRelativeTime";
import { getWeatherIcon, getWeatherIconColor } from "@/utils/weatherIcon";
import { LAS_LENAS_WI_BODIES } from "@/lib/server/las-lenas/wiBodies";

const LIVE_MAX_MS = 30 * 60 * 1000;

const LUCIDE: Record<string, string> = {
  wind: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.8 19.6A2 2 0 1 0 14 16H2m15.5-8a2.5 2.5 0 1 1 2 4H2m7.8-7.6A2 2 0 1 1 11 8H2"/>`,
  eye: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></g>`,
  droplets: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M7 16.3c2.2 0 4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05"/><path d="M12.56 6.6A11 11 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></g>`,
  "chevron-down": `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9l6 6l6-6"/>`,
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lucide(name: keyof typeof LUCIDE, className: string, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${LUCIDE[name]}</svg>`;
}

function weatherSvg(description: string | null | undefined, className: string, size: number): string {
  const iconName = getWeatherIcon(description).replace(/^wi:/, "");
  const body = LAS_LENAS_WI_BODIES[iconName] ?? LAS_LENAS_WI_BODIES["day-cloudy"];
  const color = getWeatherIconColor(description);
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8DB8D8";
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" width="${size}" height="${size}" viewBox="0 0 30 30" style="color: ${safeColor}" aria-hidden="true">${body ?? ""}</svg>`;
}

function fmtTimestampLine(iso: string | null): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
    return `${datePart} · ${timePart}`;
  } catch {
    return iso;
  }
}

function fmtForecastStrip(dateStr: string): { name: string; dateLine: string } {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const name = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(d);
    const dateLine = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(d);
    return { name, dateLine };
  } catch {
    return { name: dateStr, dateLine: "" };
  }
}

export function lasLenasDataIsLive(updatedAt: string, nowMs = Date.now()): boolean {
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  const age = nowMs - t;
  return age >= 0 && age < LIVE_MAX_MS;
}

export function renderLasLenasDynamicHtml(snapshot: LasLenasSnapshot): {
  weatherHtml: string;
  footHtml: string;
} {
  const { place, current, forecast, forecastSource } = snapshot;
  const conditionLabel = current?.description?.trim() || "Sin datos de condición";
  const windLine =
    current?.wind.direction && current.wind.speedKmh != null
      ? `${current.wind.direction} · ${current.wind.speedKmh} km/h`
      : current?.wind.direction
        ? current.wind.direction
        : "—";
  const visLine = current?.visibilityKm != null ? `${current.visibilityKm} km` : "—";
  const humidityLine = current?.humidity != null ? `${current.humidity}%` : "—";

  const firstFcRange = forecast.find((d) => d.tempMinC != null && d.tempMaxC != null);
  let tempRangePct: number | null = null;
  let tempRangeMin: number | null = null;
  let tempRangeMax: number | null = null;
  if (current?.temperatureC != null && firstFcRange?.tempMinC != null && firstFcRange?.tempMaxC != null) {
    const lo = firstFcRange.tempMinC;
    const hi = firstFcRange.tempMaxC;
    if (hi > lo) {
      tempRangeMin = lo;
      tempRangeMax = hi;
      const raw = ((current.temperatureC - lo) / (hi - lo)) * 100;
      tempRangePct = Math.min(95, Math.max(5, Math.round(raw)));
    }
  }

  const observed = current?.observedAt ? fmtTimestampLine(current.observedAt) : "";
  const tempHtml =
    current?.temperatureC != null
      ? `<span class="las-lenas-temp-num">${esc(current.temperatureC.toFixed(1))}</span><span class="las-lenas-temp-unit">°C</span>`
      : `<span class="las-lenas-temp-num las-lenas-temp-num--na">—</span>`;
  const rangeHtml =
    tempRangePct != null && tempRangeMin != null && tempRangeMax != null
      ? `<div class="las-lenas-temp-range-bar" aria-hidden="true"><span class="las-lenas-tr-min">${esc(String(tempRangeMin))}°</span><div class="las-lenas-tr-track"><div class="las-lenas-tr-fill" style="width: ${tempRangePct}%"><span class="las-lenas-tr-thumb"></span></div></div><span class="las-lenas-tr-max">${esc(String(tempRangeMax))}°</span></div>`
      : "";

  const weatherHtml = current
    ? `<div class="las-lenas-main"><div class="las-lenas-temp-block"><div class="las-lenas-icon-temp"><span class="las-lenas-weather-icon-host" role="img" aria-label="${esc(conditionLabel)}">${weatherSvg(current.description, "las-lenas-weather-icon", 44)}</span><div class="las-lenas-temp-value">${tempHtml}</div></div>${rangeHtml}<p class="las-lenas-desc">${esc(conditionLabel)}</p>${observed ? `<p class="las-lenas-ts">${esc(observed)}</p>` : ""}</div><div class="las-lenas-divider-v" aria-hidden="true"></div><div class="las-lenas-metrics"><div class="las-lenas-metric-row">${lucide("wind", "las-lenas-metric-ico", 14)}<span class="las-lenas-metric-lbl">Viento</span><span class="las-lenas-metric-val">${esc(windLine)}</span></div><div class="las-lenas-metric-row">${lucide("eye", "las-lenas-metric-ico", 14)}<span class="las-lenas-metric-lbl">Visibilidad</span><span class="las-lenas-metric-val">${esc(visLine)}</span></div><div class="las-lenas-metric-row">${lucide("droplets", "las-lenas-metric-ico", 14)}<span class="las-lenas-metric-lbl">Humedad</span><span class="las-lenas-metric-val">${esc(humidityLine)}</span></div></div></div>`
    : "";

  const days = forecast
    .map((d, i) => {
      const { name, dateLine } = fmtForecastStrip(d.date);
      const desc = d.description?.trim() || "";
      const temps =
        d.tempMinC != null && d.tempMaxC != null
          ? `<span class="las-lenas-fday-min">${esc(String(d.tempMinC))}°</span><span class="las-lenas-fday-slash" aria-hidden="true">/</span><span class="las-lenas-fday-max">${esc(String(d.tempMaxC))}°</span>`
          : d.tempMaxC != null
            ? `<span class="las-lenas-fday-max las-lenas-fday-max--solo">máx. ${esc(String(d.tempMaxC))}°</span>`
            : `<span class="las-lenas-fday-na">—</span>`;
      return `<div class="las-lenas-fc-slot">${i > 0 ? `<div class="las-lenas-fc-sep" aria-hidden="true"></div>` : ""}<div class="las-lenas-fday"><div class="las-lenas-fday-row"><span class="las-lenas-fday-icon-host" role="img" aria-label="${esc(desc || "Pronóstico")}">${weatherSvg(d.description, "las-lenas-fday-icon", 32)}</span><div class="las-lenas-fday-content"><div class="las-lenas-fday-head"><span class="las-lenas-fday-name">${esc(name)}</span><span class="las-lenas-fday-dot" aria-hidden="true">·</span><span class="las-lenas-fday-date">${esc(dateLine)}</span></div><div class="las-lenas-fday-temps">${temps}</div>${desc ? `<p class="las-lenas-fday-desc">${esc(desc)}</p>` : ""}</div></div></div></div>`;
    })
    .join("");

  const forecastHtml =
    forecast.length > 0
      ? `<details class="las-lenas-fc" id="las-lenas-pronostico"><summary class="las-lenas-fc-summary"><span class="las-lenas-fc-summary-row"><span class="las-lenas-fc-summary-main"><h3 class="las-lenas-fc-title">Próximos días</h3><span class="las-lenas-fc-sub"><span class="las-lenas-fc-sub-line">Pronóstico por jornada</span><span class="las-lenas-fc-cta"><span class="las-lenas-fc-cta-more"> · Desplegar</span><span class="las-lenas-fc-cta-less"> · Contraer</span></span></span></span>${lucide("chevron-down", "las-lenas-fc-chevron", 20)}</span></summary><div class="las-lenas-fc-body"><div class="las-lenas-fc-strip">${days}</div>${forecastSource === "wttr_in" ? `<p class="las-lenas-fc-note">Pronóstico complementario para planificar la visita.</p>` : ""}</div></details>`
      : "";

  const stationRefShort =
    place.station && place.station.distanceKm != null
      ? `Ref: ${place.station.name} · ${place.station.distanceKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`
      : place.station
        ? `Ref: ${place.station.name}`
        : "";
  const updatedRel = formatRelativeTimeAgo(snapshot.updatedAt);
  const updatedFooter = updatedRel ? `Actualizado ${updatedRel}` : "";
  const footHtml = `${stationRefShort ? `<span class="las-lenas-foot-src">${esc(stationRefShort)}</span>` : ""}${updatedFooter ? `<span class="las-lenas-foot-up">${esc(updatedFooter)}</span>` : ""}`;

  return { weatherHtml: `${weatherHtml}${forecastHtml}`, footHtml };
}
