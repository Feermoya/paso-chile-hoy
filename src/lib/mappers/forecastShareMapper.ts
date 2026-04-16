import type { ForecastItemView } from "@/types/pass-view";
import type { ForecastShareData, ForecastShareDay } from "@/types/forecast-share";

export interface ForecastShareMapperInput {
  slug?: string;
  passName: string;
  forecast: ForecastItemView[];
  sourceUrl?: string;
  nowIso?: string;
  maxDays?: number;
}

function toShareDay(item: ForecastItemView): ForecastShareDay {
  return {
    period: item.period?.trim() || "Sin período",
    date: item.date?.trim() || undefined,
    description: item.description?.trim() || undefined,
    temperatureC: item.temperatureC ?? null,
    wind: item.wind?.trim() || null,
    visibility: item.visibility?.trim() || null,
  };
}

function formatGeneratedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Generado recientemente";
  return `Generado ${d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function mapForecastToShareData(input: ForecastShareMapperInput): ForecastShareData {
  const generatedAtIso = input.nowIso ?? new Date().toISOString();
  const maxDays = input.maxDays && input.maxDays > 0 ? input.maxDays : 5;
  const days = (input.forecast ?? []).slice(0, maxDays).map(toShareDay);
  const passName = input.passName.trim() || "Paso";

  return {
    slug: input.slug,
    passName,
    title: `Pronóstico del paso`,
    subtitle: passName,
    days,
    sourceName: "Paso Chile Hoy",
    sourceUrl: input.sourceUrl?.trim() || "https://www.pasochilehoy.com",
    generatedAtIso,
    generatedLabel: formatGeneratedLabel(generatedAtIso),
  };
}
