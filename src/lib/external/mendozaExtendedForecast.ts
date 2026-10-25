/**
 * Boletín extendido (Prensa Mendoza): señal por día, complementaria al forecast corto del paso.
 * No reemplaza "Próximas horas" ni el motor principal; alimenta `cristoRisk` y la UI "Panorama extendido".
 */

import type { ForecastItemView } from "@/types/pass-view";

/** Nivel visual / motor por día (subset del riesgo global). */
export type ExtendedDayRiskLevel = "low" | "moderate" | "high";

export interface ExtendedForecastDaySignal {
  dayLabel: string;
  summary: string;
  detail: string;
  riskLevel: ExtendedDayRiskLevel;
  keywords: string[];
}

/** Temperaturas del corredor argentino publicadas en el parte (no son el dato SMN del paso). */
export interface CordilleraStationTemp {
  name: string;
  temperatureC: number;
}

export interface ExtendedForecastSignal {
  relevantDays: ExtendedForecastDaySignal[];
  /** True si hay al menos un día relevante con riesgo no bajo. */
  hasRelevantFutureRisk: boolean;
  /** True si hay al menos un día en el listado relevante (compat / audit). */
  affectsFutureDay: boolean;
  /** Uspallata → Las Cuevas, si el parte las publica. */
  cordilleraStations: CordilleraStationTemp[];
}

const ADVERSE_KEYS = [
  "mal tiempo",
  "precipit",
  "chaparron",
  "chaparrones",
  "nev",
  "tormenta",
  "lluvia",
  "inestab",
] as const;

const DAY_HEADER =
  /\b(Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\s+(\d{1,2})\b/gi;

const TZ_MENDOZA = "America/Argentina/Mendoza";

function mendozaCalendarDay(iso?: string): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso.trim());
  if (Number.isNaN(t)) return null;
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_MENDOZA,
    day: "numeric",
  }).format(new Date(t));
  const n = parseInt(day, 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeWeekday(w: string): string {
  return w
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace("miercoles", "miercoles")
    .replace("sabado", "sabado");
}

function extractAltaMontanaBlock(dayBody: string): string {
  const m = dayBody.match(
    /alta\s+monta(?:ñ|n)a\s*:([\s\S]+?)(?=temperaturas?\s+promedio\b|m[aá]xima\b|m[ií]nima\b|$)/i,
  );
  return (m?.[1] ?? "").trim();
}

const NEGATED_WEATHER =
  /\b(?:no\s+se\s+esperan?|no\s+se\s+prev[eé]n?|sin)\s+(?:precipitaciones?|lluvias?|lloviznas?|nevadas?|nieve|tormentas?|chaparrones?)\b/gi;

/** «No se esperan precipitaciones» no es un día de lluvia. */
function weatherTextForRisk(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(NEGATED_WEATHER, " ").toLowerCase();
}

const STATION_RE =
  /(Uspallata|Punta de Vacas|Puente del Inca|Las Cuevas)\s*:\s*(-?\d+(?:[.,]\d+)?)\s*°/gi;

export function extractCordilleraStations(bulletinText: string): CordilleraStationTemp[] {
  const plain = stripBulletinHtml(bulletinText);
  const out: CordilleraStationTemp[] = [];
  for (const m of plain.matchAll(STATION_RE)) {
    const name = m[1] ?? "";
    const temperatureC = Number((m[2] ?? "").replace(",", "."));
    if (!name || !Number.isFinite(temperatureC)) continue;
    if (out.some((s) => s.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ name, temperatureC });
  }
  return out;
}

/** El boletín a veces trae HTML (`<strong>`, `<br>`); lo dejamos en texto plano para UI y reglas. */
export function stripBulletinHtml(s: string): string {
  return s
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : " ";
    })
    .replace(/&#x([\da-fA-F]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : " ";
    })
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordsIn(text: string): string[] {
  const d = weatherTextForRisk(text);
  return ADVERSE_KEYS.filter((k) => d.includes(k));
}

function riskLevelForAmText(am: string): ExtendedDayRiskLevel {
  const d = weatherTextForRisk(am);
  if (
    /\bnev\b|nevada|nevadas|nieve|aguanieve|tormenta\s+fuertes?\b/.test(d) ||
    (d.includes("tormenta") && d.includes("fuerte"))
  ) {
    return "high";
  }
  if (
    d.includes("mal tiempo") ||
    d.includes("precipit") ||
    d.includes("chaparron") ||
    d.includes("tormenta") ||
    d.includes("lluvia") ||
    d.includes("inestab")
  ) {
    return "moderate";
  }
  return "low";
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const cut = t.split(/(?<=[.!?])\s+/)[0] ?? t;
  return cut.length > 0 ? cut : t;
}

/**
 * Con pronóstico corto "rico" (≥3 franjas), el Viernes del mismo día civil que el scrape
 * suele estar cubierto por "Próximas horas"; otros días del boletín se consideran complementarios.
 */
function isBeyondShortHorizon(
  weekdayNorm: string,
  shortForecast: ForecastItemView[],
  bulletinDayNum: number,
  scrapedAtIso?: string,
): boolean {
  const rich = shortForecast.length >= 3;
  if (!rich) return true;
  if (weekdayNorm !== "viernes") return true;
  const anchor = mendozaCalendarDay(scrapedAtIso);
  if (anchor == null) return false;
  return bulletinDayNum !== anchor;
}

function dayLabelPretty(rawHeader: string): string {
  const t = rawHeader.trim();
  return t.charAt(0).toLocaleUpperCase("es-AR") + t.slice(1);
}

export interface BuildExtendedForecastOptions {
  /** Filas del pronóstico corto (solo `period`) para heurística de horizonte. */
  shortForecast: ForecastItemView[];
  scrapedAtIso?: string;
}

/**
 * Parsea el texto del boletín (fragmento ya recortado desde Prensa Mendoza) y arma días relevantes.
 */
export function buildExtendedForecastSignal(
  bulletinText: string,
  options: BuildExtendedForecastOptions,
): ExtendedForecastSignal {
  const text = bulletinText.replace(/\r\n/g, "\n").trim();
  const cordilleraStations = text ? extractCordilleraStations(text) : [];
  if (!text) {
    return { relevantDays: [], hasRelevantFutureRisk: false, affectsFutureDay: false, cordilleraStations };
  }

  const matches = [...text.matchAll(new RegExp(DAY_HEADER.source, "gi"))];
  const days: ExtendedForecastDaySignal[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const idx = m.index ?? 0;
    const headerLen = m[0].length;
    const nextIdx = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const dayBody = text.slice(idx + headerLen, nextIdx).trim();
    const weekdayRaw = m[1] ?? "";
    const weekdayNorm = normalizeWeekday(weekdayRaw);
    const bulletinDayNum = parseInt(m[2] ?? "0", 10);

    if (
      !isBeyondShortHorizon(
        weekdayNorm,
        options.shortForecast,
        bulletinDayNum,
        options.scrapedAtIso,
      )
    ) {
      continue;
    }

    const am = stripBulletinHtml(extractAltaMontanaBlock(dayBody));
    if (!am || am.length < 12) continue;

    const kw = keywordsIn(am);
    const risk = riskLevelForAmText(am);
    if (risk === "low" && kw.length === 0) continue;

    const amNorm = am.replace(/\s+/g, " ").trim();
    const lead = firstSentence(amNorm);
    const summary = truncate(lead, 140);
    const rest = amNorm.slice(lead.length).trim();
    const detail = truncate(rest || lead, 220);

    days.push({
      dayLabel: dayLabelPretty(m[0]),
      summary,
      detail: detail || summary,
      riskLevel: risk,
      keywords: kw,
    });
  }

  const hasRelevantFutureRisk = days.some((d) => d.riskLevel !== "low");
  const affectsFutureDay = days.length > 0;

  return {
    relevantDays: days,
    hasRelevantFutureRisk,
    affectsFutureDay,
    cordilleraStations,
  };
}
