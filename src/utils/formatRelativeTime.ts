const esAR = "es-AR";

/** Texto tipo "hace 12 min" respecto a `iso` (UTC). */
export function formatRelativeTimeAgo(iso: string | undefined, nowMs: number = Date.now()): string {
  if (!iso?.trim()) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";

  const diffMs = Math.max(0, nowMs - t);
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;

  return new Intl.DateTimeFormat(esAR, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
