import type { CristoRedentorRiskLevelV1 } from "@/types/cristo-redentor-risk-v1";

export type ForecastShareStatus = "idle" | "generating" | "success" | "error";

export interface ForecastShareDay {
  period: string;
  date?: string;
  description?: string;
  temperatureC?: string | number | null;
  wind?: string | null;
  visibility?: string | null;
}

/** Fragmento de `cristoRisk` para la card PNG (solo Cristo Redentor). */
export interface ForecastShareCristoRisk {
  headline: string;
  summaryShort: string;
  level: CristoRedentorRiskLevelV1;
  confidence: "high" | "medium" | "low";
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
  cristoRisk?: ForecastShareCristoRisk;
}
