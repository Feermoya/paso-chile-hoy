import type { ForecastItemView } from "@/types/pass-view";
import { dedupeHtmlAlertsAgainstJson } from "@/utils/dedupeHtmlAlerts";
import { shouldSuppressMotivoAlert } from "@/utils/motivoFilters";

export type PassCardWeatherVariant = "sunny" | "cloudy" | "rain" | "snow" | "storm" | "wind";

/** Texto de alerta sin etiquetas (compacto, una línea). */
function cleanAlertText(raw: string): string {
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseWindKmh(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function getWeatherVariant(description: string, wind?: string | null): PassCardWeatherVariant {
  const d = description.toLowerCase();
  const w = parseWindKmh(wind ?? undefined) ?? 0;
  if (d.includes("niev") || d.includes("snow")) return "snow";
  if (d.includes("torm") || d.includes("storm") || d.includes("tormenta")) return "storm";
  if (d.includes("lluv") || d.includes("rain") || d.includes("llovizn") || d.includes("precip")) return "rain";
  if (d.includes("vient") && w > 40) return "wind";
  if (d.includes("nublado") || d.includes("cubierto") || d.includes("cloud") || d.includes("parcial")) {
    return "cloudy";
  }
  return "sunny";
}

export type WeatherPreviewResult = { text: string; critical: boolean };

export type PassCardAlertInput = {
  htmlAlerts?: string[];
  forecast?: ForecastItemView[];
  vialidadObservaciones?: string | null;
  vialidadEstado?: string | null;
  vialidadRuta?: string | null;
  vialidadTramo?: string | null;
  rawStatus?: string | null;
  motivo?: string | null;
  motivoInfo?: string | null;
};

function truncatePreview(s: string, max = 60): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, 57)}…`;
}

/** Misma lógica de título que `AlertsBlock.astro` (RN / tramo). */
function buildVialidadTitle(estado: string, ruta: string, tramo: string): string {
  const parts: string[] = [];
  const e = estado.trim();
  if (e && e.toUpperCase() !== "HABILITADA") {
    parts.push(
      e
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" "),
    );
  }
  const rn = ruta.trim();
  if (rn) parts.push(`RN ${rn}`);
  const tr = tramo.trim();
  if (tr) parts.push(`Tramo: ${tr}`);
  return parts.join(", ");
}

function textIsCriticalHomeLine(s: string): boolean {
  return /niev|snow|corte|cerrad|cierre|cerrado|torm|storm/i.test(s);
}

type AlertCandidate = { text: string; score: number };

/** Normaliza tildes para regex sobre texto de fuentes mixtas. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Prioridad numérica (mayor = más importante en la card).
 * Ej.: pronóstico "domingo + lluvia" > aviso "frío / abrigo".
 */
function scoreAlertImportance(text: string): number {
  const s = fold(text);
  let score = 120;

  if (/corte\s*total|circulacion\s*bloquead|paso\s*cerrad|cerrado\s*al\s*publico/i.test(s)) {
    score = Math.max(score, 980);
  }
  if (/niev|nevada|nieve|avalanch|alud/i.test(s)) score = Math.max(score, 940);
  if (/torm|tormenta|rayo/i.test(s)) score = Math.max(score, 900);
  if (/cortada|restringida|corte\s*vial|cierre\s*extra|cierre\s*por/i.test(s)) {
    score = Math.max(score, 860);
  }
  if (/corte\s*preventivo/.test(s)) score = Math.max(score, 880);

  const namedDay =
    /\b(domingo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|dom|lun|mar|mie|mier|jue|vie|sab)\b/i.test(
      text,
    );
  const hasRainSnow = /lluv|llov|rain|precip|niev|nevada|nieve|torm/i.test(s);
  if (namedDay && hasRainSnow) score = Math.max(score, 820);
  if (/mañana|manana/.test(s) && hasRainSnow) score = Math.max(score, 800);
  if (hasRainSnow) score = Math.max(score, 680);
  if (/niev|nevada|nieve/.test(s)) score = Math.max(score, 720);

  if (/restricc|precauc|demora|velocidad\s*max|velocidad\s*máx|vialidad\s*nacional/i.test(s)) {
    score = Math.max(score, 540);
  }

  if (/frio|fri[oó]|abrigo|ropa\s*de\s*abrigo|capas|temperaturas?\s*bajas|sensacion\s*termica\s*baj|helad/i.test(s)) {
    score = Math.max(score, 400);
  }

  if (/atencion|atenci[oó]n/.test(s)) score = Math.max(score, 350);

  return score;
}

function criticalForCandidate(text: string, estU: string): boolean {
  const isCorteTotal = estU === "CORTE TOTAL" || estU.includes("CORTE TOTAL");
  return isCorteTotal || textIsCriticalHomeLine(text);
}

function forecastAlertLine(f: ForecastItemView): string | null {
  const p = (f.period ?? "").trim();
  const d = (f.description ?? "").trim();
  if (!d && !p) return null;
  const temp =
    f.temperatureC != null && Number.isFinite(f.temperatureC) ? ` · ${f.temperatureC}°` : "";
  if (p && d) return `${p}: ${d}${temp}`;
  if (d) return `${d}${temp}`;
  return p || null;
}

/**
 * Elige una sola línea entre todas las fuentes: gana la de **mayor score**.
 * Permite mostrar primero un aviso de frío y, cuando exista algo más grave (p. ej. lluvia el domingo), pasar a ese.
 */
export function getWeatherPreviewAlert(input: PassCardAlertInput): WeatherPreviewResult | null {
  const {
    htmlAlerts,
    forecast,
    vialidadObservaciones,
    vialidadEstado,
    vialidadRuta,
    vialidadTramo,
    rawStatus,
    motivo,
    motivoInfo,
  } = input;

  const vr = vialidadRuta ?? "";
  const vt = vialidadTramo ?? "";
  const estU = (vialidadEstado ?? "").trim().toUpperCase();
  const showVialidad = Boolean(estU && estU !== "HABILITADA");

  const m = (motivo ?? "").trim();
  const info = (motivoInfo ?? "").trim();

  const htmlExtra = dedupeHtmlAlertsAgainstJson(htmlAlerts, {
    motivo: m || null,
    motivoInfo: info || null,
    vialidadObservaciones: (vialidadObservaciones ?? "").trim() || null,
  });

  const candidates: AlertCandidate[] = [];

  if (showVialidad) {
    const title = buildVialidadTitle(vialidadEstado ?? "", vr, vt);
    const obs = (vialidadObservaciones ?? "").trim();
    const showObs =
      Boolean(obs) && obs.toLowerCase() !== "transitable" && obs.length > 3;
    const line = showObs ? `${title} · ${obs}` : title;
    const cleaned = cleanAlertText(line);
    if (cleaned.length > 3) {
      const isCorteTotal = estU === "CORTE TOTAL" || estU.includes("CORTE TOTAL");
      const base = scoreAlertImportance(cleaned);
      const score = isCorteTotal ? Math.max(base, 990) : Math.max(base, 640);
      candidates.push({ text: cleaned, score });
    }
  }

  if (info.length > 0) {
    const t = cleanAlertText(info);
    if (t.length >= 6) candidates.push({ text: t, score: scoreAlertImportance(t) });
  }

  if (m.length > 0 && !shouldSuppressMotivoAlert(m)) {
    const t = cleanAlertText(m);
    if (t.length >= 6) candidates.push({ text: t, score: scoreAlertImportance(t) });
  }

  for (const raw of htmlExtra) {
    const t = cleanAlertText(raw);
    if (t.length < 8) continue;
    candidates.push({ text: t, score: scoreAlertImportance(t) });
  }

  const fc = forecast ?? [];
  for (const f of fc) {
    const line = forecastAlertLine(f);
    if (!line || line.length < 6) continue;
    const cleaned = cleanAlertText(line);
    const sc = scoreAlertImportance(cleaned);
    if (sc >= 400 || /lluv|llov|niev|nevada|nieve|rain|snow|torm|precip/i.test(fold(cleaned))) {
      candidates.push({ text: cleaned, score: sc });
    }
  }

  if (rawStatus?.trim().toUpperCase() === "CONDICIONADO") {
    const t = m.length > 0 ? cleanAlertText(m) : "Paso con condiciones especiales";
    if (t.length >= 6) {
      candidates.push({
        text: t,
        score: Math.max(420, scoreAlertImportance(t)),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  const best = candidates[0]!;

  return {
    text: truncatePreview(best.text),
    critical: criticalForCandidate(best.text, estU),
  };
}

const SVG_NS = ' xmlns="http://www.w3.org/2000/svg"';

const ICONS: Record<PassCardWeatherVariant, string> = {
  sunny: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <g class="sun-rays">
    <line x1="26" y1="4" x2="26" y2="10" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="42" x2="26" y2="48" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="4" y1="26" x2="10" y2="26" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="42" y1="26" x2="48" y2="26" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="10" y1="10" x2="14" y2="14" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="38" y1="38" x2="42" y2="42" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="42" y1="10" x2="38" y2="14" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="10" y1="42" x2="14" y2="38" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <circle class="sun-disc" cx="26" cy="26" r="10" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
</svg>`,

  rain: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <path class="cloud-body" d="M10 28a8 8 0 010-16c.34 0 .67.02 1 .06A10 10 0 0130 14a8 8 0 010 16H10z" fill="#94a3b8"/>
  <line class="rain-drop" x1="16" y1="34" x2="14" y2="42" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
  <line class="rain-drop rain-drop--2" x1="24" y1="34" x2="22" y2="42" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
  <line class="rain-drop rain-drop--3" x1="32" y1="34" x2="30" y2="42" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  cloudy: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <path class="cloud-back" d="M18 30a6 6 0 010-12c.25 0 .5.01.74.04A7.5 7.5 0 0134 20a6 6 0 010 12H18z" fill="#cbd5e1"/>
  <path class="cloud-front" d="M8 36a8 8 0 010-16c.34 0 .67.02 1 .06A10 10 0 0128 22a8 8 0 010 16H8z" fill="#94a3b8"/>
</svg>`,

  snow: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <g class="snowflake">
    <line x1="26" y1="8" x2="26" y2="44" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="8" y1="26" x2="44" y2="26" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="12" y1="12" x2="40" y2="40" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="40" y1="12" x2="12" y2="40" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="26" cy="8" r="2.5" fill="#bfdbfe"/>
    <circle cx="26" cy="44" r="2.5" fill="#bfdbfe"/>
    <circle cx="8" cy="26" r="2.5" fill="#bfdbfe"/>
    <circle cx="44" cy="26" r="2.5" fill="#bfdbfe"/>
  </g>
</svg>`,

  storm: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <path class="storm-cloud" d="M10 28a8 8 0 010-16c.34 0 .67.02 1 .06A10 10 0 0130 14a8 8 0 010 16H10z" fill="#64748b"/>
  <path class="storm-bolt" d="M27 18l-4 11h5.5l-3.5 9 9.5-13h-6l2.5-7z" fill="#fbbf24" stroke="#d97706" stroke-width="0.4" stroke-linejoin="round"/>
</svg>`,

  wind: `<svg class="weather-icon-svg" viewBox="0 0 52 52" fill="none"${SVG_NS} aria-hidden="true">
  <path class="wind-line wind-line--1" d="M8 18h28a4 4 0 010 8H12" stroke="#34d399" stroke-width="2.2" stroke-linecap="round"/>
  <path class="wind-line wind-line--2" d="M12 28h26a3.5 3.5 0 010 7H10" stroke="#6ee7b7" stroke-width="2.2" stroke-linecap="round"/>
  <path class="wind-line wind-line--3" d="M10 38h30a3 3 0 010 6H14" stroke="#a7f3d0" stroke-width="2.2" stroke-linecap="round"/>
</svg>`,
};

export function getWeatherIconHtml(variant: PassCardWeatherVariant): string {
  return ICONS[variant] ?? ICONS.sunny;
}
