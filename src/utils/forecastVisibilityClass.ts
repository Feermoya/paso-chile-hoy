/** Clases CSS para color de visibilidad en pronóstico (tokens semáforo). */
export function forecastVisibilityClass(visibility: string | undefined): string {
  if (!visibility?.trim()) return "text-[var(--color-text-secondary)]";
  const t = visibility.toLowerCase();
  if (/muy\s*buena|excelente|^buena$/i.test(t)) return "text-[var(--color-open)]";
  if (/buena/i.test(t) && !/muy\s*mala|mala/i.test(t)) return "text-[var(--color-open)]";
  if (/regular|media/i.test(t)) return "text-[var(--color-conditional)]";
  if (/muy\s*mala|mala|pésima|pesima/i.test(t)) return "text-[var(--color-closed)]";
  return "text-[var(--color-text-secondary)]";
}
