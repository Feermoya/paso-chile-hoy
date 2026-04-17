import type { PasoConfig } from "@/data/pasos";
import {
  buildExtendedForecastSignal,
  type ExtendedForecastSignal,
} from "@/lib/external/mendozaExtendedForecast";
import { computeCristoRedentorRiskV1 } from "@/lib/risk/computeCristoRedentorRiskV1";
import { isPassSnapshotShape, type PassSnapshot } from "@/lib/server/passMapper";
import { mapPersistedSnapshotToView } from "@/lib/mappers/passViewMapper";
import type { CristoRedentorRiskV1 } from "@/types/cristo-redentor-risk-v1";
import type { PassView } from "@/types/pass-view";
import type { PassRaw } from "@/types/pass-raw";
import { assessDrivingConditions, weatherNowToDrivingInput } from "@/utils/drivingConditions";
import { formatRelativeTimeAgo } from "@/utils/formatRelativeTime";
import { heroScheduleFromView } from "@/utils/heroScheduleFromView";
import { inferPassStatus, type PassStatusResult } from "@/utils/inferPassStatus";
import { weatherNowHasDisplayableContent } from "@/utils/passViewGuards";
import {
  getCristoRedentorScheduleLabelOverride,
  getCristoRedentorScheduleOverride,
} from "@/utils/cristoRedentorManualOverrides";

function readExtendedForecastText(raw: PassRaw | PassSnapshot): string | undefined {
  if (raw && typeof raw === "object" && "extendedForecastText" in raw) {
    const t = (raw as { extendedForecastText?: unknown }).extendedForecastText;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return undefined;
}

const EMPTY_DRIVING_WEATHER = {
  temperatureC: null as number | null,
  wind: null as string | null,
  visibilityKm: null as number | string | null,
  description: "",
};

/** Payload canónico para página del paso (SSR + API + refresh). */
export interface PassPageRefreshPayload {
  view: PassView;
  statusResult: PassStatusResult;
  scheduleText: string;
  lastUpdatedRelative: string;
  officialUrl?: string;
  showNow: boolean;
  showForecast: boolean;
  hideScheduleInDetails: boolean;
  /** Solo `cristo-redentor` (Pass Risk Engine v1). */
  cristoRisk?: CristoRedentorRiskV1;
  /**
   * Señal derivada de `extendedForecastText` en el snapshot (boletín extendido). Solo `cristo-redentor`.
   */
  extendedForecastSignal?: ExtendedForecastSignal;
}

/** Respuesta JSON de GET/POST `/api/snapshot/[slug]` y `/api/refresh/[slug]`. */
export interface PassSnapshotApiEnvelope extends PassPageRefreshPayload {
  stale: boolean;
  refreshFailed: boolean;
  message?: string;
  /** Snapshot persistido tal como se guardó (Redis/archivo). */
  snapshot?: PassRaw | PassSnapshot;
  /** Relativo a `lastKnownGoodAt` del snapshot. */
  lastKnownGoodRelative?: string;
}

export function buildPassRefreshPayload(
  raw: PassRaw | PassSnapshot,
  paso: PasoConfig,
): PassPageRefreshPayload {
  const view = mapPersistedSnapshotToView(raw, paso);
  const scheduleOverride = getCristoRedentorScheduleOverride(paso.slug);
  const scheduleLabelOverride = getCristoRedentorScheduleLabelOverride(paso.slug);
  if (scheduleOverride) {
    view.operationalInfo.schedule = scheduleOverride;
  }
  if (scheduleLabelOverride) {
    view.operationalInfo.scheduleRaw = scheduleLabelOverride;
  }
  const statusResult = inferPassStatus(view);
  if (scheduleOverride) {
    statusResult.closesInMinutes = undefined;
    statusResult.opensInMinutes = undefined;
  }
  const scheduleText = scheduleLabelOverride ?? heroScheduleFromView(view);
  const lastUpdatedRelative = view.meta.scrapedAt ? formatRelativeTimeAgo(view.meta.scrapedAt) : "";
  const officialUrl = view.meta.sourceUrl;
  const now = view.weather?.now;
  const forecast = view.weather?.forecast ?? [];
  const showNow = Boolean(now && weatherNowHasDisplayableContent(now));
  const showForecast = forecast.length > 0;

  const hasUsableNow = Boolean(now && weatherNowHasDisplayableContent(now));
  const drivingForRisk = assessDrivingConditions(
    now ? weatherNowToDrivingInput(now) : EMPTY_DRIVING_WEATHER,
    forecast,
  );

  let extendedForecastSignal: ExtendedForecastSignal | undefined;
  if (paso.slug === "cristo-redentor") {
    const extendedText = readExtendedForecastText(raw);
    if (extendedText) {
      extendedForecastSignal = buildExtendedForecastSignal(extendedText, {
        shortForecast: forecast,
        scrapedAtIso: view.meta.scrapedAt,
      });
    }
    const shouldLog =
      import.meta.env.DEV ||
      (typeof process !== "undefined" && process.env.DEBUG_PASS === "true");
    if (shouldLog) {
      const rd = extendedForecastSignal?.relevantDays ?? [];
      console.log("[cristo-risk][extended]", {
        applied: extendedForecastSignal?.hasRelevantFutureRisk ?? false,
        days: rd.map((d) => d.dayLabel),
      });
    }
  }

  const cristoRisk =
    paso.slug === "cristo-redentor"
      ? computeCristoRedentorRiskV1({
          view,
          statusResult,
          driving: drivingForRisk,
          hasUsableNow,
          extendedForecastSignal,
        })
      : undefined;

  return {
    view,
    statusResult,
    scheduleText,
    lastUpdatedRelative,
    officialUrl,
    showNow,
    showForecast,
    hideScheduleInDetails: Boolean(scheduleText.trim()),
    ...(cristoRisk !== undefined ? { cristoRisk } : {}),
    ...(paso.slug === "cristo-redentor" && extendedForecastSignal !== undefined
      ? { extendedForecastSignal }
      : {}),
  };
}

export function buildPassSnapshotApiEnvelope(
  raw: PassRaw | PassSnapshot,
  paso: PasoConfig,
  flags: {
    stale?: boolean;
    refreshFailed?: boolean;
    message?: string;
  } = {},
): PassSnapshotApiEnvelope {
  const base = buildPassRefreshPayload(raw, paso);
  const snapShape = isPassSnapshotShape(raw);
  const stale =
    flags.stale === true || (snapShape && raw.operationalStale === true);
  const lastKnownGoodRelative =
    snapShape && raw.lastKnownGoodAt?.trim()
      ? formatRelativeTimeAgo(raw.lastKnownGoodAt.trim())
      : undefined;

  return {
    ...base,
    stale,
    refreshFailed: flags.refreshFailed === true,
    ...(flags.message ? { message: flags.message } : {}),
    snapshot: raw,
    ...(lastKnownGoodRelative ? { lastKnownGoodRelative } : {}),
  };
}
