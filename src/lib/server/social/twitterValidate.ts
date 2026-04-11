import type { LatestTweetSnapshot } from "@/lib/server/social/twitterTypes";

export function validateLatestTweetSnapshot(s: LatestTweetSnapshot): boolean {
  if (!s.text?.trim() || s.text.trim().length < 10) return false;
  if (!s.url?.trim()) return false;
  try {
    const u = new URL(s.url);
    if (u.protocol !== "https:") return false;
    if (!/^\/PasoCRMza\/status\/\d+$/.test(u.pathname)) return false;
  } catch {
    return false;
  }
  if (!s.date?.trim()) return false;
  if (!["x-scrape", "status-scrape", "nitter-rss"].includes(s.source)) return false;
  return true;
}
