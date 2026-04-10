import {
  interpretVisibility,
  interpretWind,
} from "@/utils/weatherInterpretation";

export interface DrivingAssessment {
  level: "normal" | "caution" | "warning" | "danger";
  title: string;
  message: string;
  tips: string[];
  icon: string;
  color: string;
  bgColor: string;
}

export interface DrivingWeatherInput {
  temperatureC: number | null;
  wind: string | null;
  visibilityKm: number | string | null;
  description: string;
}

export interface DrivingForecastItemInput {
  period?: string;
  temperatureC?: number | null;
  wind?: string | null;
  visibility?: string | null;
  description?: string;
}

function forecastAssessment(
  forecast: DrivingForecastItemInput[],
): DrivingAssessment | null {
  for (const f of forecast) {
    const d = (f.description ?? "").toLowerCase();
    if (
      d.includes("nevada") ||
      d.includes("nieve") ||
      d.includes("lluvia y nev") ||
      d.includes("lluvias y nev") ||
      d.includes("tormenta fuerte")
    ) {
      const when = f.period?.trim() ? `${f.period.trim()}: ` : "";
      return {
        level: "caution",
        title: "Pronóstico: nieve o precipitaciones",
        message: `En las próximas horas se esperan condiciones adversas (${when}${f.description ?? "nieve o lluvia"}). Planificá el cruce con margen.`,
        tips: [
          "Consultá el parte oficial antes de salir",
          "Llevá cadenas si el paso las exige",
          "Anticipá visibilidad reducida",
        ],
        icon: "lucide:snowflake",
        color: "var(--color-conditional)",
        bgColor: "rgba(240, 168, 48, 0.06)",
      };
    }
  }

  for (const f of forecast) {
    const d = (f.description ?? "").toLowerCase();
    if (d.includes("tormenta") && !d.includes("nev")) {
      const when = f.period?.trim() ? `${f.period.trim()}: ` : "";
      return {
        level: "caution",
        title: "Pronóstico: tormentas",
        message: `Se esperan tormentas (${when}${f.description ?? ""}). Lluvia intensa y visibilidad variable en la ruta.`,
        tips: [
          "Luces encendidas y velocidad moderada",
          "Atención a tramos mojados y drenaje",
        ],
        icon: "lucide:cloud-lightning",
        color: "var(--color-conditional)",
        bgColor: "rgba(240, 168, 48, 0.06)",
      };
    }
  }

  for (const f of forecast) {
    const d = (f.description ?? "").toLowerCase();
    if (d.includes("lluvia") || d.includes("llovizna")) {
      const when = f.period?.trim() ? `${f.period.trim()}: ` : "";
      return {
        level: "caution",
        title: "Pronóstico: lluvia",
        message: `Se espera lluvia (${when}${f.description ?? ""}). La calzada puede mojarse durante el cruce.`,
        tips: [
          "Aumentá distancia de frenado",
          "Precaución en curvas sobre asfalto mojado",
        ],
        icon: "lucide:cloud-rain",
        color: "var(--color-conditional)",
        bgColor: "rgba(240, 168, 48, 0.06)",
      };
    }
  }

  return null;
}

export function assessDrivingConditions(
  weather: DrivingWeatherInput,
  forecast: DrivingForecastItemInput[] = [],
): DrivingAssessment {
  const desc = weather.description.toLowerCase();
  const visData = interpretVisibility(weather.visibilityKm);
  const windData = interpretWind(weather.wind);

  if (
    desc.includes("nevada") ||
    desc.includes("nieve") ||
    desc.includes("lluvia y nev") ||
    desc.includes("lluvias y nev") ||
    desc.includes("tormenta fuerte")
  ) {
    return {
      level: "danger",
      title: "Nevada o tormenta en el paso",
      message:
        "Hay precipitaciones activas en la ruta. La calzada puede estar cubierta de nieve o hielo.",
      tips: [
        "Verificá con Gendarmería antes de salir",
        "Cadenas obligatorias si el paso las requiere",
        "Reducí la velocidad significativamente",
        "Mantené distancia de seguridad ampliada",
      ],
      icon: "lucide:snowflake",
      color: "var(--color-closed)",
      bgColor: "rgba(224, 85, 85, 0.06)",
    };
  }

  if (visData.level === "poor") {
    return {
      level: "danger",
      title: "Visibilidad reducida",
      message:
        "La visión en ruta está comprometida. Posible niebla, lluvia intensa o nieve.",
      tips: [
        "Usá luces bajas (no altas en niebla)",
        "Velocidad máxima: 40 km/h en zonas de baja visibilidad",
        "No adelantes en estas condiciones",
      ],
      icon: "lucide:eye-off",
      color: "var(--color-closed)",
      bgColor: "rgba(224, 85, 85, 0.06)",
    };
  }

  if (weather.temperatureC !== null && weather.temperatureC <= 0) {
    const hielo = weather.temperatureC <= -3;
    return {
      level: "danger",
      title: hielo
        ? "Temperatura bajo cero — riesgo de hielo"
        : "Temperatura en punto de congelamiento",
      message: hielo
        ? `${weather.temperatureC}°C en el paso. El agua en la calzada congela. Esperar hielo negro en zonas sombreadas y curvas.`
        : `${weather.temperatureC}°C. Temperatura límite de congelamiento. Precaución en tramos húmedos.`,
      tips: [
        "Reducí la velocidad en curvas y zonas sombreadas",
        "Frenadas suaves y progresivas",
        "Distancia de frenado hasta 10× mayor en hielo",
        ...(hielo ? ["Considerá posponer el cruce hasta que caliente"] : []),
      ],
      icon: "lucide:thermometer-snowflake",
      color: "var(--color-closed)",
      bgColor: "rgba(224, 85, 85, 0.06)",
    };
  }

  if (windData.level === "strong") {
    return {
      level: "warning",
      title: "Viento fuerte en la ruta",
      message: `${windData.label}. El viento puede afectar la trayectoria del vehículo, especialmente en zonas abiertas y expuestas.`,
      tips: [
        "Sujetá el volante con firmeza en tramos expuestos",
        "Reducí velocidad en vehículos altos (camionetas, acoplados, motorhomes)",
        "Atención a ráfagas en salidas de túneles y pasos angostos",
      ],
      icon: "lucide:wind",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  if (weather.temperatureC !== null && weather.temperatureC <= 5) {
    return {
      level: "caution",
      title: "Frío en el paso",
      message: `${weather.temperatureC}°C. Temperaturas bajas para la época. El asfalto puede estar frío y húmedo.`,
      tips: [
        "Precaución en la madrugada cuando temperatura baja más",
        "Verificá el pronóstico nocturno si cruzás tarde",
      ],
      icon: "lucide:thermometer",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  if (desc.includes("tormenta")) {
    return {
      level: "caution",
      title: "Tormentas en la zona",
      message:
        "Condiciones de tormenta en el paso. Lluvias que pueden reducir la visibilidad y mojar la calzada.",
      tips: [
        "Luces encendidas",
        "Reducí velocidad en tramos mojados",
        "Atención a caída de rocas en la ruta 7",
      ],
      icon: "lucide:cloud-lightning",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  if (desc.includes("lluvia") || desc.includes("llovizna")) {
    return {
      level: "caution",
      title: "Lluvia en el paso",
      message:
        "Calzada mojada. Las distancias de frenado aumentan y la adherencia disminuye.",
      tips: [
        "Velocidad moderada en curvas",
        "Atención al aquaplaning en tramos de asfalto viejo",
      ],
      icon: "lucide:cloud-rain",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  if (visData.level === "moderate") {
    return {
      level: "caution",
      title: "Visibilidad moderada",
      message:
        "La visión en ruta es limitada. Manejá con precaución y a velocidad reducida.",
      tips: [
        "Luces bajas encendidas",
        "No adelantes en zonas de niebla",
      ],
      icon: "lucide:eye",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  if (windData.level === "moderate") {
    return {
      level: "caution",
      title: "Viento moderado",
      message: `${windData.label}. Condiciones manejables para autos. Precaución extra en vehículos altos.`,
      tips: [
        "Camionetas y vehículos altos: reducí velocidad en tramos expuestos",
      ],
      icon: "lucide:wind",
      color: "var(--color-conditional)",
      bgColor: "rgba(240, 168, 48, 0.06)",
    };
  }

  const fromForecast = forecastAssessment(forecast);
  if (fromForecast) return fromForecast;

  return {
    level: "normal",
    title: "",
    message: "",
    tips: [],
    icon: "lucide:check-circle",
    color: "var(--color-open)",
    bgColor: "transparent",
  };
}
