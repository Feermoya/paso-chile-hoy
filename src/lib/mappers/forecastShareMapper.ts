import type { CristoRedentorRiskV1 } from "@/types/cristo-redentor-risk-v1";
import type { ForecastItemView } from "@/types/pass-view";
import type { ForecastShareCristoRisk, ForecastShareData, ForecastShareDay } from "@/types/forecast-share";

export interface ForecastShareMapperInput {
  slug?: string;
  passName: string;
  forecast: ForecastItemView[];
  sourceUrl?: string;
  nowIso?: string;
  maxDays?: number;
  /** Solo usado cuando `slug === \"cristo-redentor\"` — no recalcular en el mapper. */
  cristoRisk?: CristoRedentorRiskV1;
}

/** Zona del paso (Mendoza); evita horas incorrectas al formatear en servidor UTC (p. ej. Vercel). */
const FORECAST_SHARE_TZ = "America/Argentina/Mendoza";

/** Orden típico de filas en argentina.gob.ar cuando el HTML no trae texto en la primera columna. */
const PERIOD_FALLBACK_BY_INDEX = [
  "Hoy por la noche",
  "Mañana por la madrugada",
  "Mañana por la mañana",
  "Mañana por la tarde",
] as const;

function calendarYmdInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysToYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekdayLongForYmd(ymd: string, timeZone: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  for (let utcHour = 0; utcHour < 24; utcHour++) {
    const candidate = new Date(Date.UTC(y, m - 1, d, utcHour, 0, 0));
    if (calendarYmdInTz(candidate, timeZone) === ymd) {
      return new Intl.DateTimeFormat("es-AR", { timeZone, weekday: "long" }).format(candidate);
    }
  }
  const fallback = new Date(Date.UTC(y, m - 1, d, 15, 0, 0));
  return new Intl.DateTimeFormat("es-AR", { timeZone, weekday: "long" }).format(fallback);
}

function capitalizeEsWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toLocaleUpperCase("es-AR") + word.slice(1);
}

/** Reemplaza "Hoy", "Mañana" y "Pasado mañana" por el nombre del día según la fecha de referencia. */
function rewriteRelativePeriods(period: string, anchorIso: string, timeZone: string): string {
  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return period;

  const todayYmd = calendarYmdInTz(anchor, timeZone);
  const name0 = capitalizeEsWord(weekdayLongForYmd(todayYmd, timeZone));
  const name1 = capitalizeEsWord(weekdayLongForYmd(addDaysToYmd(todayYmd, 1), timeZone));
  const name2 = capitalizeEsWord(weekdayLongForYmd(addDaysToYmd(todayYmd, 2), timeZone));

  let out = period;
  if (/^Pasado mañana\b/i.test(out)) {
    out = out.replace(/^Pasado mañana\b/i, name2);
  } else if (/^Mañana\b/i.test(out)) {
    out = out.replace(/^Mañana\b/i, name1);
  } else if (/^Hoy\b/i.test(out)) {
    out = out.replace(/^Hoy\b/i, name0);
  }
  return out;
}

function isPeriodMissing(period: string | undefined): boolean {
  const p = period?.trim() ?? "";
  if (!p) return true;
  if (p.toLowerCase() === "sin período") return true;
  return false;
}

function inferPeriodFromIndex(index: number): string {
  if (index >= 0 && index < PERIOD_FALLBACK_BY_INDEX.length) {
    return PERIOD_FALLBACK_BY_INDEX[index];
  }
  return `Franja ${index + 1}`;
}

function resolvePeriod(item: ForecastItemView, index: number): string {
  const p = item.period?.trim();
  if (!isPeriodMissing(p)) return p!;
  return inferPeriodFromIndex(index);
}

function toShareDay(
  item: ForecastItemView,
  index: number,
  anchorIso: string,
  timeZone: string,
): ForecastShareDay {
  const period = rewriteRelativePeriods(resolvePeriod(item, index), anchorIso, timeZone);
  return {
    period,
    date: item.date?.trim() || undefined,
    description: item.description?.trim() || undefined,
    temperatureC: item.temperatureC ?? null,
    wind: item.wind?.trim() || null,
    visibility: item.visibility?.trim() || null,
  };
}

const CRISTO_RISK_SHARE_SUMMARY_MAX = 160;

function truncateCristoRiskSummary(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1).trimEnd();
  return `${slice}…`;
}

function toShareCristoRisk(risk: CristoRedentorRiskV1): ForecastShareCristoRisk {
  return {
    headline: risk.headline.trim(),
    summaryShort: truncateCristoRiskSummary(risk.summary, CRISTO_RISK_SHARE_SUMMARY_MAX),
    level: risk.level,
    confidence: risk.confidence,
  };
}

function formatGeneratedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Generado recientemente";
  /** `h23` = 00–23 h. Sin esto, algunos motores con `es-AR` usan 24:00–24:59 en vez de 00:00–00:59. */
  let formatted = new Intl.DateTimeFormat("es-AR", {
    timeZone: FORECAST_SHARE_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(d);
  formatted = formatted.replace(/\b24:/g, "00:");
  return `Generado ${formatted}`;
}

export function mapForecastToShareData(input: ForecastShareMapperInput): ForecastShareData {
  const generatedAtIso = input.nowIso ?? new Date().toISOString();
  const maxDays = input.maxDays && input.maxDays > 0 ? input.maxDays : 5;
  const days = (input.forecast ?? [])
    .slice(0, maxDays)
    .map((item, index) => toShareDay(item, index, generatedAtIso, FORECAST_SHARE_TZ));
  const passName = input.passName.trim() || "Paso";
  const shareCristoRisk =
    input.slug === "cristo-redentor" && input.cristoRisk !== undefined
      ? toShareCristoRisk(input.cristoRisk)
      : undefined;

  return {
    slug: input.slug,
    passName,
    title: `Pronóstico del paso`,
    subtitle: passName,
    days,
    sourceName: "Paso Chile Hoy",
    sourceUrl: input.sourceUrl?.trim() || "https://pasochilehoy.com",
    generatedAtIso,
    generatedLabel: formatGeneratedLabel(generatedAtIso),
    ...(shareCristoRisk ? { cristoRisk: shareCristoRisk } : {}),
  };
}
