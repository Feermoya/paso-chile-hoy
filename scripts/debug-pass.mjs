#!/usr/bin/env node
/**
 * Lee el snapshot local y muestra el PassView (misma lógica que la página /[slug]).
 * Uso: node scripts/debug-pass.mjs cristo-redentor
 *      npm run update:pass -- <slug>  (si falta snapshot)
 */
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
  console.error("Uso: node scripts/debug-pass.mjs <slug>");
  process.exit(1);
}

const { getPasoBySlug } = jiti(path.join(root, "src/data/pasos.ts"));
const { getSnapshotForApi } = jiti(
  path.join(root, "src/lib/server/services/snapshotService.ts"),
);
const { mapPersistedSnapshotToView } = jiti(
  path.join(root, "src/lib/mappers/passViewMapper.ts"),
);

try {
  const paso = getPasoBySlug(slug);
  if (!paso?.active) {
    console.error(JSON.stringify({ ok: false, error: "slug_inactivo_o_desconocido" }, null, 2));
    process.exit(1);
  }
  const raw = await getSnapshotForApi(slug);
  const view = mapPersistedSnapshotToView(raw, paso);
  console.log(JSON.stringify(view, null, 2));
  process.exit(0);
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}
