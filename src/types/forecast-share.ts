export type ForecastShareStatus = "idle" | "generating" | "success" | "error";

export interface ForecastShareDay {
  period: string;
  date?: string;
  description?: string;
  temperatureC?: string | number | null;
  wind?: string | null;
  visibility?: string | null;
}

export interface ForecastShareData {
  passName: string;
  title: string;
  subtitle?: string;
  days: ForecastShareDay[];
  sourceName: string;
  sourceUrl?: string;
  generatedAtIso: string;
  generatedLabel: string;
  slug?: string;
}
