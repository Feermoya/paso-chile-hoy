import type { PassSnapshot } from "@/lib/server/passMapper";
import type { PassRaw } from "@/types/pass-raw";

export type PersistedSnapshot = PassRaw | PassSnapshot;

/** Advertencias en consola (Vercel / local) si el JSON persistido está viejo. */
export function checkSnapshotFreshness(snapshot: PersistedSnapshot): void {
  const slug = snapshot.slug ?? "unknown";
  const rawAt = snapshot.scrapedAt?.trim();
  if (!rawAt) return;

  const scrapedAt = new Date(rawAt);
  if (!Number.isFinite(scrapedAt.getTime())) return;

  const ageMinutes = (Date.now() - scrapedAt.getTime()) / 60000;

  if (ageMinutes > 120) {
    console.warn(
      `[snapshot] ⚠️ ${slug}: datos tienen ${Math.round(ageMinutes)} min de antigüedad`,
    );
  }

  if (ageMinutes > 480) {
    console.error(
      `[snapshot] ❌ ${slug}: datos tienen más de 8 horas — posible fallo del cron`,
    );
  }
}
