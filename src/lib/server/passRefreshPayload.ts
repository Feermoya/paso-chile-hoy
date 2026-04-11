import type { PasoConfig } from "@/data/pasos";
import type { PassSnapshot } from "@/lib/server/passMapper";
import { mapPersistedSnapshotToView } from "@/lib/mappers/passViewMapper";
import type { PassView } from "@/types/pass-view";
import type { PassRaw } from "@/types/pass-raw";
import { formatRelativeTimeAgo } from "@/utils/formatRelativeTime";
import { heroScheduleFromView } from "@/utils/heroScheduleFromView";
import { inferPassStatus, type PassStatusResult } from "@/utils/inferPassStatus";
import { weatherNowHasDisplayableContent } from "@/utils/passViewGuards";

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
}

/** Respuesta JSON de GET/POST `/api/snapshot/[slug]` (mismo contrato). */
export interface PassSnapshotApiEnvelope extends PassPageRefreshPayload {
  stale: boolean;
  refreshFailed: boolean;
  message?: string;
}

export function buildPassRefreshPayload(
  raw: PassRaw | PassSnapshot,
  paso: PasoConfig,
): PassPageRefreshPayload {
  const view = mapPersistedSnapshotToView(raw, paso);
  const statusResult = inferPassStatus(view);
  const scheduleText = heroScheduleFromView(view);
  const lastUpdatedRelative = view.meta.scrapedAt ? formatRelativeTimeAgo(view.meta.scrapedAt) : "";
  const officialUrl = view.meta.sourceUrl;
  const now = view.weather?.now;
  const forecast = view.weather?.forecast ?? [];
  const showNow = Boolean(now && weatherNowHasDisplayableContent(now));
  const showForecast = forecast.length > 0;

  return {
    view,
    statusResult,
    scheduleText,
    lastUpdatedRelative,
    officialUrl,
    showNow,
    showForecast,
    hideScheduleInDetails: Boolean(scheduleText.trim()),
  };
}
