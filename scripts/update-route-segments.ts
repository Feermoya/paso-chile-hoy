/**
 * Actualiza snapshots filtrados en `public/snapshots/rutas/{profile}.json`.
 * Un solo fetch al JSON nacional (Google Sheets API); un build por perfil.
 *
 * Requiere: GOOGLE_SHEETS_API_KEY (preferida) o GOOGLE_SHEETS_ROUTE_KEY (compat.).
 * Carga opcional de `.env.local` en la raíz para no tener que exportar variables a mano.
 */
import { existsSync, readFileSync } from "node:fs";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Asigna solo variables aún no definidas (respeta env del shell y GitHub Actions). */
function loadEnvLocal(repoRoot: string): void {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal(root);

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "@": path.join(root, "src"),
  },
});

const { fetchNationalRouteRows } = jiti(
  path.join(root, "src/lib/server/route-segments/fetchNationalRaw.ts"),
) as { fetchNationalRouteRows: () => Promise<import("@/types/route-segments").NationalRouteRow[]> };

const { listRouteProfiles } = jiti(
  path.join(root, "src/lib/server/route-segments/profiles.ts"),
) as { listRouteProfiles: () => import("@/types/route-segments").RouteProfileConfig[] };

const { buildRouteSegmentsPayload } = jiti(
  path.join(root, "src/lib/server/route-segments/mapRawToPayload.ts"),
) as {
  buildRouteSegmentsPayload: (
    rows: import("@/types/route-segments").NationalRouteRow[],
    config: import("@/types/route-segments").RouteProfileConfig,
    generatedAtIso: string,
  ) => import("@/types/route-segments").RouteSegmentsPayload;
};

const { writeRouteSegmentsFile } = jiti(
  path.join(root, "src/lib/server/storage/routeSegmentsStorage.ts"),
) as {
  writeRouteSegmentsFile: (
    profile: string,
    payload: import("@/types/route-segments").RouteSegmentsPayload,
  ) => Promise<void>;
};

async function main(): Promise<void> {
  console.log("[route-segments] Fetch nacional (Sheets)…");
  const allRows = await fetchNationalRouteRows();
  console.log(`[route-segments] Filas nacionales parseadas: ${allRows.length}`);

  const generatedAtIso = new Date().toISOString();
  const profiles = listRouteProfiles();

  for (const config of profiles) {
    console.log(`[route-segments] Build profile "${config.profile}"…`);
    const payload = buildRouteSegmentsPayload(allRows, config, generatedAtIso);
    await writeRouteSegmentsFile(config.profile, payload);
    console.log(
      `[route-segments] ✅ ${config.profile} → ${payload.segments.length} tramos | headline: ${payload.summary.headline}`,
    );
  }

  console.log("[route-segments] Listo.");
}

main().catch((err) => {
  console.error("[route-segments] Error:", err);
  process.exit(1);
});
