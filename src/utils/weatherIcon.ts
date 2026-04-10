/** Nombre de ícono Iconify `wi:*` según descripción meteorológica (español). */
export function getWeatherIcon(description: string | undefined | null): string {
  const d = (description ?? "").toLowerCase();
  if (d.includes("despejado") || d.includes("soleado")) return "wi:day-sunny";
  if (d.includes("algo nublado") || d.includes("parcialmente")) return "wi:day-cloudy";
  if (d.includes("nublado")) return "wi:cloudy";
  if (d.includes("tormenta fuerte")) return "wi:thunderstorm";
  if (d.includes("tormenta")) return "wi:storm-showers";
  if (d.includes("lluvia y nev") || d.includes("lluvias y nev")) return "wi:rain-mix";
  if (d.includes("nevada") || d.includes("nieve")) return "wi:snow";
  if (d.includes("lluvia") || d.includes("lluvias")) return "wi:rain";
  if (d.includes("llovizna")) return "wi:sprinkle";
  if (d.includes("niebla") || d.includes("neblina")) return "wi:fog";
  if (d.includes("viento")) return "wi:windy";
  return "wi:day-cloudy";
}

/** Color del ícono climático según descripción (hex, contraste sobre fondo oscuro). */
export function getWeatherIconColor(description: string | undefined | null): string {
  const d = (description ?? "").toLowerCase();
  if (d.includes("despejado") || d.includes("soleado")) return "#F5C842";
  if (d.includes("algo nublado") || d.includes("parcialmente")) return "#8DB8D8";
  if (d.includes("nublado")) return "#7A8FA6";
  if (d.includes("tormenta")) return "#7B68EE";
  if (
    d.includes("lluvia y nev") ||
    d.includes("lluvias y nev") ||
    d.includes("lluvia y nevada")
  )
    return "#6BAED6";
  if (d.includes("nevada") || d.includes("nieve")) return "#B0D4F1";
  if (d.includes("lluvia") || d.includes("lluvias")) return "#5BAEFF";
  if (d.includes("llovizna")) return "#7EC8C8";
  if (d.includes("niebla") || d.includes("neblina")) return "#9AAAB8";
  if (d.includes("viento")) return "#A8D8A8";
  return "#8DB8D8";
}
