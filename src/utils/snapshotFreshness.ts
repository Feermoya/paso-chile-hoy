export type FreshnessLevel = "fresh" | "stale" | "very_stale" | "unknown";

export interface FreshnessResult {
  level: FreshnessLevel;
  label: string;
  warningMessage: string | null;
  ageMinutes: number | null;
}

export function assessSnapshotFreshness(scrapedAt: string | Date | null | undefined): FreshnessResult {
  if (scrapedAt == null || scrapedAt === "") {
    return {
      level: "unknown",
      label: "Hora desconocida",
      warningMessage: "No se puede verificar cuándo se actualizaron los datos.",
      ageMinutes: null,
    };
  }

  const scraped = typeof scrapedAt === "string" ? new Date(scrapedAt) : scrapedAt;
  const t = scraped.getTime();
  if (!Number.isFinite(t)) {
    return {
      level: "unknown",
      label: "Hora desconocida",
      warningMessage: "No se puede verificar cuándo se actualizaron los datos.",
      ageMinutes: null,
    };
  }

  const now = new Date();
  const ageMs = now.getTime() - t;
  const ageMinutes = Math.floor(ageMs / 60_000);

  if (ageMinutes < 1) {
    return { level: "fresh", label: "hace un momento", warningMessage: null, ageMinutes };
  }
  if (ageMinutes < 60) {
    return { level: "fresh", label: `hace ${ageMinutes} min`, warningMessage: null, ageMinutes };
  }
  if (ageMinutes < 180) {
    const h = Math.floor(ageMinutes / 60);
    const m = ageMinutes % 60;
    const label = m > 0 ? `hace ${h}h ${m}min` : `hace ${h}h`;
    return {
      level: "stale",
      label,
      warningMessage: `Los datos del sitio tienen ${label}. Pueden no reflejar la situación actual.`,
      ageMinutes,
    };
  }

  const h = Math.floor(ageMinutes / 60);
  return {
    level: "very_stale",
    label: `hace ${h} horas`,
    warningMessage: `Los datos tienen más de ${h} horas. Verificá en la fuente oficial antes de viajar.`,
    ageMinutes,
  };
}
