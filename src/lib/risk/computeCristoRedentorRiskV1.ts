import type { ExtendedForecastSignal } from "@/lib/external/mendozaExtendedForecast";
import type { CristoRedentorRiskV1 } from "@/types/cristo-redentor-risk-v1";
import type { PassView } from "@/types/pass-view";
import type { DrivingAssessment } from "@/utils/drivingConditions";
import { forecastAdverseTier } from "@/utils/forecastAdverseSignals";
import { isVialidadCorteTotal, type PassStatusResult } from "@/utils/inferPassStatus";

const COPY: Record<
  CristoRedentorRiskV1["level"],
  { headline: string; summary: string }
> = {
  low: {
    headline: "Riesgo bajo de complicaciones",
    summary:
      "Con la información disponible, el cruce se ve sin señales fuertes de complicación meteorológica o de ruta. Igual podés encontrar demoras o cambios en el parte oficial.",
  },
  moderate: {
    headline: "Riesgo moderado",
    summary:
      "Hay algunas señales (clima, visibilidad o datos incompletos) que conviene tener en cuenta antes de viajar. Esto no reemplaza el estado oficial de arriba.",
  },
  high_complications: {
    headline: "Riesgo alto de complicaciones",
    summary:
      "Se combinan condiciones de manejo o pronóstico que suelen complicar el cruce. Revisá el parte y el estado del paso antes de salir.",
  },
  possible_preventive_closure: {
    headline: "Posible cierre o restricción",
    summary:
      "El estado oficial o la vialidad muestran cierre, condicionamiento o restricción. El paso puede volver a habilitarse; esto no es una predicción de horarios.",
  },
};

/**
 * Conservador: `high` solo con clima actual usable, pronóstico con al menos 2 filas y señal clara
 * (tier adverso o manejo danger/warning). Caso contrario `medium`; datos stale o sin estado → `low`.
 */
function computeConfidence(
  view: PassView,
  statusResult: PassStatusResult,
  hasUsableNow: boolean,
  tier: "none" | "snow" | "storm" | "rain",
  forecastRowCount: number,
  drivingLevel: DrivingAssessment["level"],
  moderateOnlyIncompleteOutlook: boolean,
): CristoRedentorRiskV1["confidence"] {
  if (statusResult.status === "sin_datos" || view.meta.operationalStale === true) {
    return "low";
  }
  if (!hasUsableNow) {
    return "medium";
  }
  if (moderateOnlyIncompleteOutlook) {
    return "medium";
  }
  if (forecastRowCount < 2) {
    return "medium";
  }
  const strongSignals =
    tier !== "none" || drivingLevel === "danger" || drivingLevel === "warning";
  if (strongSignals) {
    return "high";
  }
  return "medium";
}

/**
 * Motor v1 solo para Cristo Redentor. El caller debe invocar solo con ese paso.
 */
export function computeCristoRedentorRiskV1(input: {
  view: PassView;
  statusResult: PassStatusResult;
  driving: DrivingAssessment;
  hasUsableNow: boolean;
  /** Boletín extendido (Prensa Mendoza, etc.); señal complementaria, no reemplaza el forecast corto. */
  extendedForecastSignal?: ExtendedForecastSignal;
  computedAt?: Date;
}): CristoRedentorRiskV1 {
  const { view, statusResult, driving, hasUsableNow, extendedForecastSignal } = input;
  const forecast = view.weather?.forecast ?? [];
  const tier = forecastAdverseTier(forecast);
  const vialidad = view.operationalInfo.vialidadEstado?.trim() ?? "";

  const reasons: CristoRedentorRiskV1["reasons"] = [];

  const preventive =
    statusResult.status === "cerrado" ||
    statusResult.status === "condicionado" ||
    isVialidadCorteTotal(vialidad);

  if (statusResult.status === "cerrado") {
    reasons.push({ code: "official_closed" });
  } else if (statusResult.status === "condicionado") {
    reasons.push({ code: "official_conditional" });
  } else if (isVialidadCorteTotal(vialidad)) {
    reasons.push({ code: "vialidad_corte_total" });
  }

  let level: CristoRedentorRiskV1["level"];

  if (preventive) {
    level = "possible_preventive_closure";
  } else if (driving.level === "danger" || tier === "snow") {
    if (driving.level === "danger") reasons.push({ code: "driving_danger" });
    if (tier === "snow") reasons.push({ code: "forecast_snow" });
    level = "high_complications";
  } else if (
    driving.level === "warning" ||
    driving.level === "caution" ||
    tier === "storm" ||
    tier === "rain"
  ) {
    if (driving.level === "warning") reasons.push({ code: "driving_warning" });
    if (driving.level === "caution") reasons.push({ code: "driving_caution" });
    if (tier === "storm") reasons.push({ code: "forecast_storm" });
    if (tier === "rain") reasons.push({ code: "forecast_rain" });
    level = "moderate";
  } else if (statusResult.status === "sin_datos") {
    reasons.push({ code: "official_data_incomplete" });
    level = "moderate";
  } else {
    reasons.push({ code: "conditions_favorable" });
    level = "low";
  }

  if (statusResult.status === "sin_datos" && level === "high_complications") {
    level = "moderate";
    reasons.push({ code: "capped_no_official_status" });
  }

  let moderateOnlyIncompleteOutlook = false;
  if (
    !preventive &&
    statusResult.status !== "sin_datos" &&
    view.meta.operationalStale !== true &&
    level === "low" &&
    tier === "none" &&
    (forecast.length === 0 || forecast.length === 1)
  ) {
    moderateOnlyIncompleteOutlook = true;
    level = "moderate";
    reasons.length = 0;
    reasons.push(
      forecast.length === 0
        ? { code: "forecast_outlook_incomplete" }
        : { code: "forecast_signal_limited" },
    );
  }

  if (
    extendedForecastSignal?.hasRelevantFutureRisk &&
    extendedForecastSignal?.affectsFutureDay &&
    level === "low"
  ) {
    level = "moderate";
    const filtered = reasons.filter((r) => r.code !== "conditions_favorable");
    reasons.length = 0;
    reasons.push(...filtered);
    const extDetail = extendedForecastSignal.relevantDays
      .filter((d) => d.riskLevel !== "low")
      .map(
        (d) =>
          `${d.dayLabel} (${d.riskLevel})${d.keywords.length ? `: ${d.keywords.slice(0, 4).join(", ")}` : ""}`,
      )
      .join("; ");
    reasons.push({
      code: "extended_forecast_future_risk",
      detail: extDetail || extendedForecastSignal.relevantDays.map((d) => d.dayLabel).join("; "),
    });
  }

  let confidence = computeConfidence(
    view,
    statusResult,
    hasUsableNow,
    tier,
    forecast.length,
    driving.level,
    moderateOnlyIncompleteOutlook,
  );
  if (extendedForecastSignal?.hasRelevantFutureRisk && confidence === "high") {
    confidence = "medium";
  }
  const at = input.computedAt ?? new Date();

  const text = COPY[level];

  return {
    schemaVersion: 1,
    slug: "cristo-redentor",
    computedAt: at.toISOString(),
    level,
    headline: text.headline,
    summary: text.summary,
    reasons,
    confidence,
    audit: {
      badgeStatus: statusResult.status,
      displayLabel: statusResult.displayLabel,
      drivingLevel: driving.level,
      forecastTier: tier,
      vialidadEstado: vialidad || undefined,
      operationalStale: view.meta.operationalStale === true ? true : undefined,
    },
  };
}
