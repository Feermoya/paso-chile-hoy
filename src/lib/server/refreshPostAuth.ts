/**
 * POST /api/refresh y POST /api/snapshot: si hay SCRAPE_SECRET, acepta el header
 * `x-scrape-secret` o una petición same-origin (Origin/Referer del mismo host),
 * para que el botón "Actualizar" en el sitio funcione sin exponer el secreto al cliente.
 */
export function verifyRefreshPostAuth(request: Request): boolean {
  const secret = process.env.SCRAPE_SECRET?.trim();
  if (!secret) return true;
  if (request.headers.get("x-scrape-secret") === secret) return true;

  let requestHost: string;
  try {
    requestHost = new URL(request.url).host;
  } catch {
    return false;
  }

  const sameHost = (value: string | null): boolean => {
    if (!value?.trim()) return false;
    try {
      return new URL(value).host === requestHost;
    } catch {
      return false;
    }
  };

  if (sameHost(request.headers.get("origin"))) return true;
  if (sameHost(request.headers.get("referer"))) return true;

  return false;
}
