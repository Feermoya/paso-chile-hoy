import { fetchLatestTweetFromPasoCRMza } from "@/lib/server/social/twitterLatestFetch";
import type { LocalLatestTweet, TwitterLatestFile } from "@/lib/server/social/twitterLatestLocal";
import {
  loadFullSnapshot,
  persistSnapshot,
  sameTweetContent,
} from "@/lib/server/social/twitterLatestLocal";

export type TwitterRefreshAction =
  | "updated"
  | "unchanged"
  | "fetch_failed_kept"
  | "persist_skipped";

export interface TwitterRefreshResult {
  ok: boolean;
  action: TwitterRefreshAction;
}

function emptyBase(now: string): TwitterLatestFile {
  return { latestTweet: null, updatedAt: now };
}

/**
 * Job en background: intenta actualizar el snapshot; nunca borra un tweet válido por fallo de red.
 */
export async function runTwitterLatestRefresh(): Promise<TwitterRefreshResult> {
  console.log("[twitter-refresh] started");
  const now = new Date().toISOString();

  let base = await loadFullSnapshot();
  if (!base) base = emptyBase(now);

  const withAttempt: TwitterLatestFile = {
    ...base,
    lastAttemptAt: now,
  };

  let fetched: LocalLatestTweet | null = null;
  try {
    fetched = await fetchLatestTweetFromPasoCRMza();
  } catch {
    console.log("[twitter-refresh] failed");
    const ok = await persistSnapshot(withAttempt);
    return { ok, action: ok ? "fetch_failed_kept" : "persist_skipped" };
  }

  if (!fetched) {
    console.log("[twitter-refresh] no valid tweet found");
    const ok = await persistSnapshot(withAttempt);
    return { ok, action: ok ? "fetch_failed_kept" : "persist_skipped" };
  }

  console.log("[twitter-refresh] latest tweet found");

  if (sameTweetContent(base.latestTweet, fetched)) {
    console.log("[twitter-refresh] snapshot unchanged");
    const next: TwitterLatestFile = {
      ...base,
      lastAttemptAt: now,
    };
    const ok = await persistSnapshot(next);
    return { ok, action: ok ? "unchanged" : "persist_skipped" };
  }

  const next: TwitterLatestFile = {
    ...base,
    latestTweet: fetched,
    updatedAt: now,
    lastSuccessfulRefreshAt: now,
    lastAttemptAt: now,
  };

  const ok = await persistSnapshot(next);
  if (!ok) {
    console.log("[twitter-refresh] failed");
    return { ok: false, action: "persist_skipped" };
  }

  console.log("[twitter-refresh] snapshot updated");
  return { ok: true, action: "updated" };
}
