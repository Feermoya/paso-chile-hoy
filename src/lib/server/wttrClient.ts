/**
 * Cliente wttr.in (gratis, sin API key). Ver https://wttr.in/:help
 * Usado para clima del Paso Agua Negra (mejor cobertura que SMN en la zona).
 */

import type { ClimaResponse } from "@/lib/types/apiTypes";
import type { ForecastPeriod } from "@/lib/server/forecastParser";

const WEATHER_DESCS: Record<string, string> = {
  "113": "Despejado",
  "116": "Parcialmente nublado",
  "119": "Nublado",
  "122": "Cubierto",
  "143": "Neblina",
  "176": "Lluvias aisladas",
  "179": "Nevadas aisladas",
  "182": "Aguanieve",
  "185": "Lluvia helada",
  "200": "Tormentas aisladas",
  "227": "Ventisca",
  "230": "Blizzard",
  "248": "Niebla",
  "260": "Niebla helada",
  "263": "Llovizna",
  "266": "Llovizna",
  "281": "Lluvia helada",
  "284": "Lluvia helada intensa",
  "293": "Lluvia leve",
  "296": "Lluvia leve",
  "299": "Lluvia moderada",
  "302": "Lluvia moderada",
  "305": "Lluvia intensa",
  "308": "Lluvia torrencial",
  "311": "Lluvia helada",
  "314": "Lluvia helada intensa",
  "317": "Aguanieve leve",
  "320": "Aguanieve moderada",
  "323": "Nieve leve",
  "326": "Nieve leve",
  "329": "Nieve moderada",
  "332": "Nieve moderada",
  "335": "Nieve intensa",
  "338": "Nieve intensa",
  "350": "Granizo",
  "353": "Chubascos leves",
  "356": "Chubascos moderados",
  "359": "Chubascos intensos",
  "362": "Chubascos con nieve",
  "365": "Chubascos con nieve intensa",
  "368": "Nevadas leves",
  "371": "Nevadas moderadas",
  "374": "Granizo pequeño",
  "377": "Granizo",
  "386": "Tormentas con lluvia leve",
  "389": "Tormentas con lluvia intensa",
  "392": "Tormentas con nieve leve",
  "395": "Tormentas con nieve intensa",
};

function getDesc(code: string): string {
  return WEATHER_DESCS[code] ?? "Variable";
}

function wttrClockToIsoToday(clock: string): string {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${mo}-${da}T${pad(h)}:${min}:00`;
}

function visLabel(km: number): string {
  if (km >= 10) return "Buena";
  if (km >= 5) return "Regular";
  return "Mala";
}

type WttrHourly = {
  time: string;
  tempC: string;
  weatherCode: string;
  windspeedKmph: string;
  winddir16Point: string;
  visibility: string;
  chanceofrain?: string;
  chanceofsnow?: string;
  lang_es?: { value: string }[];
};

function hourlyDesc(h: WttrHourly): string {
  const le = h.lang_es?.[0]?.value;
  return typeof le === "string" && le.trim() ? le.trim() : getDesc(h.weatherCode);
}

function buildForecastFromJ1(data: {
  weather: Array<{ hourly?: WttrHourly[] }>;
}): ForecastPeriod[] {
  const today = data.weather[0];
  const tomorrow = data.weather[1];
  if (!today?.hourly?.length) return [];

  const now = new Date();
  const currentHour = now.getHours();
  const result: ForecastPeriod[] = [];

  const todaySlots: Record<string, string> = {
    "600": "Hoy por la madrugada",
    "900": "Hoy por la mañana",
    "1200": "Hoy al mediodía",
    "1500": "Hoy por la tarde",
    "1800": "Hoy por la tarde",
    "2100": "Hoy por la noche",
  };
  const tomorrowSlots: Record<string, string> = {
    "600": "Mañana por la mañana",
    "1200": "Mañana al mediodía",
    "1500": "Mañana por la tarde",
    "2100": "Mañana por la noche",
  };

  const ordered = ["600", "900", "1200", "1500", "1800", "2100"];

  function tryDay(
    hourly: WttrHourly[],
    slots: Record<string, string>,
    skipPast: boolean,
  ): void {
    for (const key of ordered) {
      if (result.length >= 4) return;
      const label = slots[key];
      if (!label) continue;
      const h = hourly.find((x) => x.time === key);
      if (!h) continue;
      const slotHour = Math.floor(parseInt(key, 10) / 100);
      if (skipPast && slotHour <= currentHour) continue;
      const visKm = parseFloat(h.visibility);
      result.push({
        period: label,
        description: hourlyDesc(h),
        temperatureC: parseFloat(h.tempC),
        wind: `${h.winddir16Point} ${parseFloat(h.windspeedKmph)} km/h`,
        visibility: Number.isFinite(visKm) ? visLabel(visKm) : undefined,
      });
    }
  }

  tryDay(today.hourly, todaySlots, true);
  if (result.length < 4 && tomorrow?.hourly?.length) {
    tryDay(tomorrow.hourly, tomorrowSlots, false);
  }

  return result;
}

export function wttrJ1ToClimaAndForecast(
  data: unknown,
  lat: number,
  lng: number,
): { clima: ClimaResponse; forecast: ForecastPeriod[] } | null {
  const d = data as {
    current_condition?: Array<{
      temp_C: string;
      weatherCode: string;
      windspeedKmph: string;
      winddir16Point: string;
      visibility: string;
      humidity: string;
      FeelsLikeC: string;
      lang_es?: { value: string }[];
    }>;
    weather?: Array<{
      hourly?: WttrHourly[];
      astronomy?: Array<{ sunrise: string; sunset: string }>;
    }>;
  };

  const current = d.current_condition?.[0];
  const today = d.weather?.[0];
  if (!current || !today) return null;

  const desc =
    current.lang_es?.[0]?.value?.trim() || getDesc(String(current.weatherCode));
  const temp = parseFloat(current.temp_C);
  const windK = parseFloat(current.windspeedKmph);
  const visKm = parseFloat(current.visibility);
  const humidity = parseFloat(current.humidity);
  const feels = parseFloat(current.FeelsLikeC);

  const astro = today.astronomy?.[0];
  const salida_sol = astro?.sunrise ? wttrClockToIsoToday(astro.sunrise) : "";
  const puesta_sol = astro?.sunset ? wttrClockToIsoToday(astro.sunset) : "";

  const clima: ClimaResponse = {
    temperatura: {
      date: new Date().toISOString(),
      humidity: Number.isFinite(humidity) ? humidity : 0,
      pressure: 0,
      feels_like: Number.isFinite(feels) ? feels : null,
      temperature: Number.isFinite(temp) ? temp : 0,
      visibility: Number.isFinite(visKm) ? visKm : 0,
      weather: { description: desc, id: parseInt(String(current.weatherCode), 10) || 0 },
      wind: {
        direction: current.winddir16Point || "N",
        deg: null,
        speed: Number.isFinite(windK) ? windK : null,
      },
      station_id: 0,
      location: {
        id: 0,
        name: "wttr.in",
        department: "",
        province: "",
        type: "wttr",
        coord: { lon: lng, lat },
        distance: 0,
      },
    },
    puesta_sol,
    salida_sol,
  };

  const forecast = buildForecastFromJ1(d as { weather: Array<{ hourly?: WttrHourly[] }> });
  return { clima, forecast };
}

/** Obtiene clima + pronóstico corto desde wttr.in para mapear al snapshot. */
export async function fetchWttrClimaForPaso(
  query: string,
  lat: number,
  lng: number,
): Promise<{ clima: ClimaResponse; forecast: ForecastPeriod[] } | null> {
  const url = `https://wttr.in/${query}?format=j1&lang=es`;
  console.log(`[wttr] Fetching: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "paso-chile-hoy/2.0 (pasochilehoy.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[wttr] HTTP ${res.status} for ${url}`);
      return null;
    }

    const data = (await res.json()) as unknown;
    const parsed = wttrJ1ToClimaAndForecast(data, lat, lng);
    if (parsed) {
      const t = parsed.clima.temperatura.temperature;
      const desc = parsed.clima.temperatura.weather?.description;
      console.log(`[wttr] OK ${query}: ${t}°C — ${desc ?? "?"}`);
    }
    return parsed;
  } catch (err) {
    console.error("[wttr] Error fetching clima:", err);
    return null;
  }
}
