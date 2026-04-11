/** Convierte URL de Nitter (u host espejo) a x.com manteniendo path. */
export function toXComUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `https://x.com${u.pathname}${u.search}`;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "https://x.com");
  }
}
