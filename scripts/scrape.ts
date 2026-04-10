/**
 * Scraper standalone para GitHub Actions / local.
 * Escribe `public/snapshots/{slug}.json` (API oficial consolidado + clima).
 */
import { writeFileSync } from "node:fs";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPassCRTweets } from "../src/utils/twitterScraper.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "@": path.join(root, "src"),
  },
});

const { listPassSlugs } = jiti(path.join(root, "src/lib/server/config/passes.ts")) as {
  listPassSlugs: () => string[];
};
const { refreshAndPersistSnapshot } = jiti(
  path.join(root, "src/lib/server/services/snapshotService.ts"),
) as {
  refreshAndPersistSnapshot: (slug: string) => Promise<{
    scrapedAt?: string;
    rawStatus?: string;
    weather?: { temperatureC?: number | null };
  }>;
};

async function main(): Promise<void> {
  const slugs = listPassSlugs();
  let failed = false;

  for (const slug of slugs) {
    try {
      console.log(`[scrape] ${slug}…`);
      const snap = await refreshAndPersistSnapshot(slug);
      const t = snap.weather?.temperatureC;
      const tempStr = t != null && Number.isFinite(t) ? `${t}°C` : "?";
      console.log(
        `[scrape] ✅ ${slug}: ${snap.rawStatus ?? "?"} — ${tempStr} scrapedAt=${snap.scrapedAt ?? "?"}`,
      );
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      failed = true;
      console.error(`[scrape] FAIL ${slug}`, err);
    }
  }

  if (failed) {
    process.exit(1);
  }

  try {
    console.log("[scrape] Fetching tweets from @PasoCRMza…");
    const tweets = await getPassCRTweets();
    const outPath = path.join(root, "public", "snapshots", "tweets.json");
    writeFileSync(
      outPath,
      JSON.stringify({ tweets, fetchedAt: new Date().toISOString() }, null, 2),
      "utf-8",
    );
    console.log(`[scrape] tweets.json saved (${tweets.length} items)`);
  } catch (err) {
    console.error("[scrape] Twitter fetch failed (non-critical):", err);
  }

  console.log("[scrape] Done.");
}

main();
