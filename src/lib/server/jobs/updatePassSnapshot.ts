import { listPassSlugs } from "@/lib/server/config/passes";
import { refreshAndPersistSnapshot } from "@/lib/server/services/snapshotService";
import type { PassSnapshot } from "@/lib/server/passMapper";

export type UpdatePassResult =
  | { ok: true; slug: string; snapshot: PassSnapshot }
  | { ok: false; slug: string; error: string };

/**
 * Job reutilizable: mismo camino que los scripts CLI y el que puede invocarse
 * desde un cron / scheduler externo (`npm run update:all-passes`).
 */
export async function runUpdatePassSnapshot(slug: string): Promise<UpdatePassResult> {
  try {
    const snapshot = await refreshAndPersistSnapshot(slug);
    return { ok: true, slug, snapshot };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return { ok: false, slug, error: msg };
  }
}

export async function runUpdateAllPassSnapshots(): Promise<UpdatePassResult[]> {
  const slugs = listPassSlugs();
  const out: UpdatePassResult[] = [];
  for (const slug of slugs) {
    out.push(await runUpdatePassSnapshot(slug));
  }
  return out;
}
