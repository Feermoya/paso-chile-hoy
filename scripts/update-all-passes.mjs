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

const { runUpdateAllPassSnapshots } = jiti(
  path.join(root, "src/lib/server/jobs/updatePassSnapshot.ts"),
);

const results = await runUpdateAllPassSnapshots();
let failures = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`OK  ${r.slug}  scrapedAt=${r.snapshot.scrapedAt}`);
  } else {
    failures += 1;
    console.error(`FAIL ${r.slug}  ${r.error}`);
  }
}
process.exit(failures > 0 ? 1 : 0);
