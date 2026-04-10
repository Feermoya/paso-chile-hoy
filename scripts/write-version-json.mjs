#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2]?.replace(/^"|"$/g, "");
if (!version) {
  console.error("Uso: node scripts/write-version-json.mjs <version>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });

const payload = {
  version,
  releasedAt: new Date().toISOString(),
};

writeFileSync(join(publicDir, "version.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[write-version-json] public/version.json → ${version}`);
