import type { DrivingAssessment } from "@/utils/drivingConditions";
import type { PassStatusResult } from "@/utils/inferPassStatus";

export type CristoRedentorRiskLevelV1 =
  | "low"
  | "moderate"
  | "high_complications"
  | "possible_preventive_closure";

export interface CristoRedentorRiskReasonV1 {
  code: string;
  detail?: string;
}

export interface CristoRedentorRiskV1 {
  schemaVersion: 1;
  slug: "cristo-redentor";
  computedAt: string;
  level: CristoRedentorRiskLevelV1;
  headline: string;
  summary: string;
  reasons: CristoRedentorRiskReasonV1[];
  confidence: "high" | "medium" | "low";
  audit: {
    badgeStatus: PassStatusResult["status"];
    displayLabel?: string;
    drivingLevel: DrivingAssessment["level"];
    forecastTier: "none" | "snow" | "storm" | "rain";
    vialidadEstado?: string;
    operationalStale?: boolean;
  };
}
