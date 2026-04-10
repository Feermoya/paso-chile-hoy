#!/usr/bin/env node
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (typeof globalThis.fetch !== "function") {
  const { fetch } = await import("undici");
  globalThis.fetch = fetch;
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  tsconfig: path.join(root, "tsconfig.json"),
  alias: {
    "@": path.join(root, "src"),
  },
});

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: npm run update:pass -- <slug>");
  process.exit(1);
}

const { runUpdatePassSnapshot } = jiti(
  path.join(root, "src/lib/server/jobs/updatePassSnapshot.ts"),
);

const result = await runUpdatePassSnapshot(slug);
if (result.ok) {
  console.log(`OK  ${result.slug}  scrapedAt=${result.snapshot.scrapedAt}`);
  process.exit(0);
}

console.error(`FAIL ${result.slug}  ${result.error}`);
process.exit(1);
