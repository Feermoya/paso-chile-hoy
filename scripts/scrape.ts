/**
 * Scraper standalone para GitHub Actions / local.
 * Escribe `public/snapshots/{slug}.json` (mismo formato PassRaw que el sitio).
 */
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
  refreshAndPersistSnapshot: (slug: string) => Promise<unknown>;
};

async function main(): Promise<void> {
  const slugs = listPassSlugs();
  let failed = false;

  for (const slug of slugs) {
    try {
      console.log(`[scrape] ${slug}…`);
      const snap = await refreshAndPersistSnapshot(slug);
      const s = snap as { scrapedAt?: string };
      console.log(`[scrape] OK ${slug} scrapedAt=${s.scrapedAt ?? "?"}`);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      failed = true;
      console.error(`[scrape] FAIL ${slug}`, err);
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log("[scrape] Done.");
}

main();
