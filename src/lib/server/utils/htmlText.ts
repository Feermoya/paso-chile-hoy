/** Normaliza texto extraído del DOM (saltos, NBSP). */
export function normalizeText(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
