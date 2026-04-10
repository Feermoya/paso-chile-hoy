/**
 * Middleware de seguridad (rate limit, CSP, cabeceras).
 * Con `output: "static"` no registrar `src/middleware.ts`: Astro avisa por `Astro.request.headers`
 * y en Firebase igual no corre; los headers efectivos están en `firebase.json`.
 * Para SSR (adapter Node, etc.), crear `src/middleware.ts` con:
 *   import { sequence } from "astro:middleware";
 *   import { securityMiddleware } from "@/lib/server/httpSecurityMiddleware";
 *   export const onRequest = sequence(securityMiddleware);
 */
import { defineMiddleware } from "astro:middleware";

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function getRealIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requestCounts) {
      if (now > entry.resetAt) requestCounts.delete(ip);
    }
  }, 5 * 60_000);
}

/** CSP: Firebase Analytics + Google Fonts + scripts inline del HTML. Duplicar en firebase.json para hosting estático. */
export const SECURITY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const securityMiddleware = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const pathname = url.pathname.toLowerCase();

  const blockedPrefixes = [
    "/node_modules/",
    "/.git",
    "/src/",
    "/snapshots/",
    "/data/",
    "/api/scrape",
    "/api/raw",
    "/wp-admin",
    "/wp-login",
    "/phpinfo",
  ];

  const isBlocked =
    pathname.startsWith("/.env") ||
    pathname.startsWith("/.git") ||
    pathname.startsWith("/node_modules") ||
    blockedPrefixes.some((p) => pathname.startsWith(p.toLowerCase())) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isBlocked) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const ua = request.headers.get("user-agent") ?? "";
  const blockedUAs = [
    "python-requests",
    "scrapy",
    "curl/",
    "wget/",
    "go-http-client",
    "axios/",
    "node-fetch",
    "libwww-perl",
    "masscan",
    "nmap",
    "nikto",
    "sqlmap",
    "nuclei",
  ];

  const uaLower = ua.toLowerCase();
  if (blockedUAs.some((bua) => uaLower.includes(bua.toLowerCase()))) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const ip = getRealIP(request);
  if (isRateLimited(ip)) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Content-Type": "text/plain",
        "Retry-After": "60",
      },
    });
  }

  const response = await next();

  const headers = new Headers(response.headers);

  headers.delete("x-powered-by");
  headers.delete("server");
  headers.set("x-powered-by", "magic");

  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  headers.set("Content-Security-Policy", SECURITY_CSP);

  if (import.meta.env.PROD) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
