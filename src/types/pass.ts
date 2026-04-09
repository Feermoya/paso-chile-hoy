/** Estado operativo del paso (valores estables para lógica y estilos). */
export type PassStatus = "open" | "closed" | "conditional";

/** Paso fronterizo (entidad reutilizable cuando haya varios pasos). */
export interface BorderPass {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  regionArgentina: string;
  regionChile: string;
}

export interface WeatherSummary {
  conditions: string;
  temperatureC: number;
  feelsLikeC?: number;
  windKmh?: number;
  visibilityKm?: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertItem {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  issuedAt: string;
}

export interface RequirementItem {
  id: string;
  title: string;
  detail?: string;
  mandatory: boolean;
}

export type DataConfidence = "high" | "medium" | "low";

export type RiskLevel = "low" | "moderate" | "high";

/** Instantánea mostrable en home (mock hoy; API mañana). */
export interface PassStateSnapshot {
  pass: BorderPass;
  status: PassStatus;
  confidence: DataConfidence;
  updatedAt: string;
  headline: string;
  weather: WeatherSummary;
  riskLevel: RiskLevel;
  scheduleSummary: string;
  alerts: AlertItem[];
  requirements: RequirementItem[];
}
