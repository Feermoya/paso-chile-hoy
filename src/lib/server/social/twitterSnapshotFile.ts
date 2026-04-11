import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { LatestTweetSnapshot, TweetsSnapshotFile } from "@/lib/server/social/twitterTypes";
import { validateLatestTweetSnapshot } from "@/lib/server/social/twitterValidate";
import { toXComUrl } from "@/lib/server/social/twitterUrl";
import type { PassLatestTweet } from "@/types/pass-view";
import { tweetSentiment } from "@/utils/tweetSentiment";
import type { PassTwitterAlert } from "@/lib/server/social/twitterTypes";

const SLUG_KEYWORDS: Record<string, string[]> = {
  "cristo-redentor": [
    "cristo redentor",
    "rn7",
    "rn 7",
    "sistema integrado",
    "tunel",
    "tunnel",
    "libertadores",
  ],
  pehuenche: ["pehuenche", "rn145", "rn 145"],
  "agua-negra": ["agua negra", "rn150", "rn 150"],
};

function tweetsSnapshotPath(): string {
  return join(process.cwd(), "public", "snapshots", "tweets.json");
}

function parseTweetsSnapshotFile(raw: string): TweetsSnapshotFile | null {
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return null;
    const o = j as Record<string, unknown>;
    if (typeof o.updatedAt !== "string" || !o.updatedAt.trim()) return null;

    let latestTweet: LatestTweetSnapshot | null = null;
    if (o.latestTweet != null && typeof o.latestTweet === "object") {
      const lt = o.latestTweet as LatestTweetSnapshot;
      if (validateLatestTweetSnapshot(lt)) latestTweet = lt;
    }

    let passAlerts: PassTwitterAlert[] | undefined;
    if (Array.isArray(o.passAlerts)) {
      passAlerts = o.passAlerts.filter(isPassTwitterAlert);
    } else if (Array.isArray(o.tweets)) {
      passAlerts = (o.tweets as unknown[]).filter(isPassTwitterAlert);
    }

    return { latestTweet, updatedAt: o.updatedAt.trim(), passAlerts };
  } catch {
    return null;
  }
}

function isPassTwitterAlert(x: unknown): x is PassTwitterAlert {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  if (typeof a.text !== "string" || a.text.trim().length < 10) return false;
  if (typeof a.date !== "string") return false;
  if (typeof a.url !== "string") return false;
  if (!Array.isArray(a.passesmentioned)) return false;
  if (!["cierre", "apertura", "condicion", "info"].includes(String(a.alertType))) return false;
  return a.passesmentioned.every((p) => typeof p === "string");
}

/** Lee y valida `tweets.json` (solo filesystem; sin red). */
export function readTweetsSnapshotFile(): TweetsSnapshotFile | null {
  const p = tweetsSnapshotPath();
  if (!existsSync(p)) return null;
  try {
    return parseTweetsSnapshotFile(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/** Último tweet válido para la home (solo snapshot). */
export function readHomeLatestTweetFromSnapshot(): LatestTweetSnapshot | null {
  return readTweetsSnapshotFile()?.latestTweet ?? null;
}

/**
 * Tweet relevante para una página de paso, desde el mismo snapshot (sin red).
 * Compatibilidad con el scrape: usa `passAlerts` o heurística por palabras clave.
 */
export function getPassTweetFromSnapshot(slug: string): PassLatestTweet | null {
  const file = readTweetsSnapshotFile();
  if (!file?.passAlerts?.length) return null;

  for (const a of file.passAlerts) {
    if (!a.text?.trim() || a.text.trim().length < 10) continue;
    const textLower = a.text.toLowerCase();
    const keywords = SLUG_KEYWORDS[slug] ?? [];
    const relevant =
      a.passesmentioned.includes(slug) ||
      keywords.some((k) => textLower.includes(k)) ||
      textLower.includes("habilitado") ||
      textLower.includes("cerrado");
    if (relevant) {
      return {
        text: a.text,
        date: a.date,
        url: toXComUrl(a.url),
        sentiment: tweetSentiment(a.text),
      };
    }
  }
  return null;
}
