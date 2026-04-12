/**
 * Pronóstico diario resumido desde wttr.in (j1) por coordenadas.
 * Complementa el clima actual oficial (argentina.gob.ar), no lo reemplaza.
 */

import type { LasLenasForecastDay, LasLenasForecastPeriod } from "@/types/las-lenas";
import { LAS_LENAS_WTTR_QUERY } from "@/lib/server/las-lenas/constants";

type WttrHourly = {
  time?: string;
  tempC?: string;
  humidity?: string;
  chanceofrain?: string;
  lang_es?: Array<{ value?: string }>;
  weatherDesc?: Array<{ value?: string }>;
};

type WttrDay = {
  date?: string;
  maxtempC?: string;
  mintempC?: string;
  hourly?: WttrHourly[];
};

/** Orden de franjas para elegir descripción (prioridad tarde). */
const PERIOD_ORDER: { time: string; period: LasLenasForecastPeriod }[] = [
  { time: "1500", period: "afternoon" },
  { time: "1200", period: "afternoon" },
  { time: "900", period: "morning" },
  { time: "1800", period: "afternoon" },
  { time: "2100", period: "night" },
  { time: "600", period: "early_morning" },
  { time: "0", period: "night" },
  { time: "300", period: "night" },
];

function num(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function descFromHourly(hourly: WttrHourly[] | undefined): { text: string | null; period: LasLenasForecastPeriod | null } {
  if (!hourly?.length) return { text: null, period: null };
  for (const { time, period } of PERIOD_ORDER) {
    const h = hourly.find((x) => x.time === time);
    if (!h) continue;
    const es = h.lang_es?.[0]?.value?.trim();
    if (es) return { text: es, period };
    const en = h.weatherDesc?.[0]?.value?.trim();
    if (en) return { text: en, period };
  }
  return { text: null, period: null };
}

function humidityRainRange(hourly: WttrHourly[] | undefined): {
  hMin: number | null;
  hMax: number | null;
  rMin: number | null;
  rMax: number | null;
} {
  if (!hourly?.length) {
    return { hMin: null, hMax: null, rMin: null, rMax: null };
  }
  const hums: number[] = [];
  const rains: number[] = [];
  for (const h of hourly) {
    const hu = num(h.humidity);
    if (hu != null) hums.push(hu);
    const r = num(h.chanceofrain);
    if (r != null) rains.push(r);
  }
  const hMin = hums.length ? Math.min(...hums) : null;
  const hMax = hums.length ? Math.max(...hums) : null;
  const rMin = rains.length ? Math.min(...rains) : null;
  const rMax = rains.length ? Math.max(...rains) : null;
  return { hMin, hMax, rMin, rMax };
}

function mapDay(d: WttrDay): LasLenasForecastDay {
  const date = typeof d.date === "string" && d.date.trim() ? d.date.trim() : "";
  const { text, period } = descFromHourly(d.hourly);
  const { hMin, hMax, rMin, rMax } = humidityRainRange(d.hourly);
  return {
    date,
    tempMinC: num(d.mintempC),
    tempMaxC: num(d.maxtempC),
    description: text,
    humidityMin: hMin,
    humidityMax: hMax,
    rainProbabilityMin: rMin,
    rainProbabilityMax: rMax,
    dominantPeriod: period,
  };
}

/** Hasta `maxDays` días desde hoy. */
export async function fetchWttrDailyOutlook(maxDays: number): Promise<LasLenasForecastDay[]> {
  const url = `https://wttr.in/${encodeURIComponent(LAS_LENAS_WTTR_QUERY)}?format=j1&lang=es`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "paso-chile-hoy/2.0 (las-lenas; pasochilehoy.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { weather?: WttrDay[] };
    const days = Array.isArray(data.weather) ? data.weather : [];
    return days.slice(0, maxDays).filter((d) => d.date).map(mapDay);
  } catch {
    return [];
  }
}
