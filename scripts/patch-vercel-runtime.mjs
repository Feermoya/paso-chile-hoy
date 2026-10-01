/**
 * @astrojs/vercel@7 solo declara Node 18/20. En Node 24 cae a nodejs18.x,
 * runtime que Vercel ya rechaza. Reescribimos las functions a nodejs24.x.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const functionsDir = path.resolve(".vercel/output/functions");
const TARGET = "nodejs24.x";

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.warn("[patch-vercel-runtime] No hay .vercel/output/functions; nada que parchear.");
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.name === ".vc-config.json") {
      await patch(full);
    }
  }
}

async function patch(file) {
  const json = JSON.parse(await readFile(file, "utf8"));
  if (typeof json.runtime !== "string" || !json.runtime.startsWith("nodejs")) return;
  if (json.runtime === TARGET) return;
  const previous = json.runtime;
  json.runtime = TARGET;
  await writeFile(file, `${JSON.stringify(json)}\n`);
  console.log(`[patch-vercel-runtime] ${path.relative(process.cwd(), file)}: ${previous} → ${TARGET}`);
}

await walk(functionsDir);
