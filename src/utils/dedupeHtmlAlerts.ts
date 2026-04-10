/**
 * Quita alertas HTML que repiten texto ya presente en los campos del JSON consolidado.
 */
export function dedupeHtmlAlertsAgainstJson(
  htmlAlerts: string[] | undefined,
  ctx: {
    motivo?: string | null;
    motivoExtra?: string | null;
    vialidadObservaciones?: string | null;
  },
): string[] {
  if (!htmlAlerts?.length) return [];

  const bucket = [ctx.motivo, ctx.motivoExtra, ctx.vialidadObservaciones]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return htmlAlerts.filter((alert) => {
    const a = alert.replace(/\s+/g, " ").trim();
    if (a.length < 11) return false;
    if (!bucket) return true;
    const al = a.toLowerCase();
    for (let n = Math.min(50, al.length); n >= 12; n--) {
      const frag = al.slice(0, n);
      if (bucket.includes(frag)) return false;
    }
    return true;
  });
}
