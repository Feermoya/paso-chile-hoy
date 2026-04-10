// ============================================================
// VISIBILIDAD
// ============================================================
export function interpretVisibility(
  km: number | string | null | undefined,
): {
  label: string;
  meaning: string;
  level: "good" | "moderate" | "poor" | "unknown";
} {
  if (km === null || km === undefined || km === "—") {
    return { label: "—", meaning: "Sin datos", level: "unknown" };
  }

  const n = typeof km === "string" ? parseFloat(km) : km;

  if (Number.isNaN(n)) {
    const s = String(km).toLowerCase();
    if (s.includes("muy buena") || s.includes("excelente"))
      return {
        label: String(km),
        meaning: "Horizonte despejado. Ideal para circular.",
        level: "good",
      };
    if (s.includes("buena"))
      return {
        label: String(km),
        meaning: "Buena visión de la ruta. Sin inconvenientes.",
        level: "good",
      };
    if (s.includes("regular"))
      return {
        label: String(km),
        meaning: "Visión reducida. Manejá con precaución.",
        level: "moderate",
      };
    if (s.includes("muy mala") || s.includes("muy mal"))
      return {
        label: String(km),
        meaning: "Visión muy baja. Riesgo real en ruta.",
        level: "poor",
      };
    if (s.includes("mala") || s.includes("mal"))
      return {
        label: String(km),
        meaning: "Visión baja. Reducí la velocidad.",
        level: "poor",
      };
    return { label: String(km), meaning: "", level: "unknown" };
  }

  if (n >= 10)
    return {
      label: `${n} km`,
      meaning: "Visibilidad excelente. Horizonte despejado.",
      level: "good",
    };
  if (n >= 5)
    return {
      label: `${n} km`,
      meaning: "Buena visibilidad. Sin problemas para circular.",
      level: "good",
    };
  if (n >= 2)
    return {
      label: `${n} km`,
      meaning: "Visibilidad reducida. Manejá con precaución.",
      level: "moderate",
    };
  if (n >= 0.5)
    return {
      label: `${n} km`,
      meaning: "Visibilidad muy baja. Posible niebla o nevada.",
      level: "poor",
    };
  return {
    label: `${n} km`,
    meaning: "Visibilidad casi nula. Condiciones de riesgo.",
    level: "poor",
  };
}

// ============================================================
// VIENTO
// ============================================================
export function interpretWind(wind: string | null | undefined): {
  label: string;
  meaning: string;
  level: "calm" | "light" | "moderate" | "strong" | "unknown";
} {
  if (!wind || wind.trim() === "" || wind === "—") {
    return { label: "—", meaning: "Sin datos", level: "unknown" };
  }

  const raw = wind.trim();
  const s = raw.toLowerCase();

  if (s === "calma" || s.startsWith("calma ") || s.includes("0-2") || s.includes("0–2")) {
    return {
      label: /^calma\b/i.test(raw) ? "Calma" : raw,
      meaning: "Sin viento. Condiciones tranquilas.",
      level: "calm",
    };
  }

  const match = raw.match(/(\d+)[-–](\d+)\s*km\/h/i);
  if (match) {
    const max = parseInt(match[2], 10);
    if (max <= 20)
      return {
        label: raw,
        meaning: "Viento suave. No afecta la conducción.",
        level: "light",
      };
    if (max <= 40)
      return {
        label: raw,
        meaning: "Viento moderado. Puede afectar vehículos altos.",
        level: "moderate",
      };
    if (max <= 60)
      return {
        label: raw,
        meaning: "Viento fuerte. Precaución con vehículos altos y motos.",
        level: "strong",
      };
    return {
      label: raw,
      meaning: "Viento muy fuerte. Riesgo para vehículos livianos.",
      level: "strong",
    };
  }

  return { label: raw, meaning: "", level: "unknown" };
}

// ============================================================
// TEMPERATURA
// ============================================================
export function interpretTemperature(c: number | null | undefined): {
  meaning: string;
  level: "ok" | "cold" | "freezing";
} {
  if (c === null || c === undefined) return { meaning: "", level: "ok" };
  if (c <= -5)
    return {
      meaning: "Temperatura bajo cero. Alto riesgo de hielo en la calzada.",
      level: "freezing",
    };
  if (c <= 2)
    return {
      meaning: "Cerca del punto de congelamiento. Posible hielo en zonas sombreadas.",
      level: "cold",
    };
  if (c <= 8)
    return {
      meaning: "Frío. Llevá ropa de abrigo adecuada.",
      level: "cold",
    };
  return { meaning: "", level: "ok" };
}

// ============================================================
// COLOR DE NIVEL (variables CSS)
// ============================================================
export function levelToColor(level: string): string {
  if (level === "good" || level === "calm" || level === "light" || level === "ok")
    return "var(--color-open)";
  if (level === "moderate") return "var(--color-conditional)";
  if (level === "poor" || level === "strong" || level === "freezing" || level === "cold")
    return "var(--color-closed)";
  return "var(--color-text-muted)";
}
