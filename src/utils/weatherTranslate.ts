/**
 * Traduce datos técnicos de clima a lenguaje simple + semáforo (bueno / regular / malo).
 */

export type TrafficLight = "good" | "regular" | "bad" | "neutral";

export interface TranslatedValue {
  label: string;
  detail?: string;
  level: TrafficLight;
}

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Extrae km/h conservador (máximo de rango) desde texto tipo "SO a 23-31 km/h". */
export function parseWindKmhFromString(wind: string | null | undefined): number | null {
  if (!wind?.trim()) return null;
  const m = wind.match(/(\d+)(?:-(\d+))?\s*km\/h/i);
  if (!m) return null;
  return m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
}

export function translateVisibility(km: number | string | null | undefined): TranslatedValue {
  if (km == null || km === "") {
    return { label: "Sin datos", level: "neutral" };
  }

  if (typeof km === "string") {
    const n = num(km);
    if (n != null) {
      return translateVisibilityNumeric(n);
    }
    const s = km.toLowerCase();
    if (s.includes("excelente") || s.includes("muy buena")) {
      return { label: "Excelente", detail: "Horizonte despejado", level: "good" };
    }
    if (s.includes("buena")) {
      return { label: "Buena", detail: km.trim(), level: "good" };
    }
    if (s.includes("regular")) {
      return { label: "Regular", detail: "Visión reducida", level: "regular" };
    }
    if (s.includes("muy mala") || s.includes("muy mal")) {
      return { label: "Mala", detail: "Muy reducida", level: "bad" };
    }
    if (s.includes("mala") || s.includes("mal")) {
      return { label: "Mala", detail: km.trim(), level: "bad" };
    }
    return { label: km.trim(), detail: km.trim(), level: "neutral" };
  }

  return translateVisibilityNumeric(km);
}

function translateVisibilityNumeric(v: number): TranslatedValue {
  if (v >= 10) return { label: "Excelente", detail: "Horizonte despejado", level: "good" };
  if (v >= 5) return { label: "Buena", detail: `${v} km de visibilidad`, level: "good" };
  if (v >= 2) return { label: "Regular", detail: "Niebla o lluvia posible", level: "regular" };
  if (v >= 0.5) return { label: "Mala", detail: "Muy reducida", level: "bad" };
  return { label: "Nula", detail: "Visibilidad peligrosa", level: "bad" };
}

export function translateWind(kmph: number | string | null | undefined): TranslatedValue {
  const v = num(kmph);
  if (v == null) return { label: "Sin datos", level: "neutral" };
  if (v === 0) return { label: "Calma", detail: "Sin viento", level: "good" };
  if (v <= 19) return { label: "Leve", detail: `${v} km/h — condiciones tranquilas`, level: "good" };
  if (v <= 38) return { label: "Moderado", detail: `${v} km/h — manejable`, level: "good" };
  if (v <= 61) return { label: "Fuerte", detail: `${v} km/h — precaución`, level: "regular" };
  if (v <= 88) return { label: "Muy fuerte", detail: `${v} km/h — peligroso`, level: "bad" };
  return { label: "Tormenta", detail: `${v} km/h — no viajar`, level: "bad" };
}

export function translateWindWithDir(windStr: string | null | undefined): TranslatedValue {
  if (!windStr?.trim()) return { label: "Sin datos", level: "neutral" };

  const calma = windStr.toLowerCase().includes("calma");
  if (calma && !/\d/.test(windStr)) {
    const raw = windStr.trim();
    if (/^calma$/i.test(raw)) {
      return { label: "Calma", level: "good" };
    }
    return { label: "Calma", detail: raw, level: "good" };
  }

  const match = windStr.match(/(\d+)(?:-(\d+))?\s*km\/h/i);
  if (!match) {
    return { label: windStr.trim(), detail: windStr.trim(), level: "neutral" };
  }

  const speed = match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10);
  const dirMatch = windStr.match(/^([A-Za-zÁÉÍÓÚÑ]{1,4})\s+/);
  const dir = dirMatch ? ` · ${dirMatch[1].toUpperCase()}` : "";

  const base = translateWind(speed);
  return { ...base, label: base.label + dir };
}

export function translateTemp(celsius: number | null | undefined): TranslatedValue {
  if (celsius == null || !Number.isFinite(celsius)) {
    return { label: "Sin datos", level: "neutral" };
  }
  if (celsius <= -10) return { label: "Extremo frío", detail: "Riesgo de congelamiento", level: "bad" };
  if (celsius <= -5) return { label: "Muy frío", detail: "Cadenas obligatorias posible", level: "bad" };
  if (celsius <= 0) return { label: "Bajo cero", detail: "Precaución en ruta", level: "bad" };
  if (celsius <= 5) return { label: "Frío", detail: "Abrigo necesario", level: "regular" };
  if (celsius <= 15) return { label: "Fresco", detail: "Condiciones normales", level: "good" };
  if (celsius <= 25) return { label: "Templado", detail: "Buenas condiciones", level: "good" };
  return { label: "Cálido", detail: "Buen momento para cruzar", level: "good" };
}

export function translateConditionLevel(description: string | null | undefined): TrafficLight {
  if (!description?.trim()) return "neutral";
  const d = description.toLowerCase();

  if (/nevada|nieve|blizzard|tormenta|ventisca|granizo/.test(d)) return "bad";
  if (/lluvia\s+(intensa|torrencial|fuerte)|chubascos\s+intensos/.test(d)) return "bad";
  if (/niebla|neblina|visibilidad\s+(mala|nula|reducida)/.test(d)) return "bad";

  if (/lluvia|llovizna|chubascos/.test(d)) return "regular";
  if (/parcialmente nublado con/.test(d)) return "regular";
  if (/algo nublado|moderad[oa]/.test(d)) return "regular";

  if (/despejado|soleado|claro/.test(d)) return "good";
  if (/ligeramente nublado/.test(d)) return "good";
  if (/parcialmente nublado/.test(d)) return "good";

  return "neutral";
}

export interface DrivingSummary {
  label: string;
  sublabel: string;
  level: TrafficLight;
}

export function getDrivingSummary(params: {
  description?: string | null;
  visibilityKm?: number | null;
  visibilityText?: string | null;
  windKmph?: number | null;
  temperatureC?: number | null;
}): DrivingSummary {
  const { description, visibilityKm, visibilityText, windKmph, temperatureC } = params;

  const condLevel = translateConditionLevel(description);
  let visLevel: TrafficLight = "neutral";
  if (visibilityKm != null && Number.isFinite(visibilityKm)) {
    visLevel = translateVisibility(visibilityKm).level;
  } else if (visibilityText?.trim()) {
    visLevel = translateVisibility(visibilityText).level;
  }
  const windLevel = windKmph != null && Number.isFinite(windKmph) ? translateWind(windKmph).level : "neutral";
  const tempLevel =
    temperatureC != null && Number.isFinite(temperatureC) ? translateTemp(temperatureC).level : "neutral";

  const levels: TrafficLight[] = [condLevel, visLevel, windLevel, tempLevel];
  const hasBad = levels.includes("bad");
  const hasRegular = levels.includes("regular");

  if (hasBad) {
    return {
      label: "Condiciones difíciles",
      sublabel: "Revisar antes de salir",
      level: "bad",
    };
  }
  if (hasRegular) {
    return {
      label: "Condiciones regulares",
      sublabel: "Precaución en ruta",
      level: "regular",
    };
  }
  return {
    label: "Buenas condiciones",
    sublabel: "Clima favorable",
    level: "good",
  };
}

export function levelClass(level: TrafficLight): string {
  const map: Record<TrafficLight, string> = {
    good: "wt-good",
    regular: "wt-regular",
    bad: "wt-bad",
    neutral: "wt-neutral",
  };
  return map[level];
}

/** Pronóstico: visibilidad ya viene como etiqueta (“Buena”, “Regular”, …). */
export function translateForecastVisibilityLabel(label: string | null | undefined): TranslatedValue | null {
  if (!label?.trim()) return null;
  const t = label.trim().toLowerCase();
  if (t.includes("excelente") || t.includes("muy buena") || /\bbuena\b/.test(t)) {
    return translateVisibility(10);
  }
  if (t.includes("regular")) return translateVisibility(4);
  if (t.includes("muy mala") || /\bmala\b/.test(t)) return translateVisibility(1.5);
  return translateVisibility(label.trim());
}
