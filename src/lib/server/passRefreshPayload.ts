import type { PasoConfig } from "@/data/pasos";
import { isPassSnapshotShape, type PassSnapshot } from "@/lib/server/passMapper";
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
