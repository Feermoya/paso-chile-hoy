import type { APIRoute } from "astro";
import { PASOS } from "@/data/pasos";
import { SITE_URL } from "@/utils/seo";

export const prerender = true;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function url(loc: string, priority: string, changefreq: string, lastmod: string) {
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
}

/** W3C Datetime en UTC (Google acepta también YYYY-MM-DD; este formato es más preciso en builds). */
function lastmodNow(): string {
  return new Date().toISOString();
}

export const GET: APIRoute = () => {
  const lm = lastmodNow();
  const base = SITE_URL.replace(/\/$/, "");

  const paths: { path: string; priority: string; changefreq: string }[] = [
    { path: "/", priority: "1.0", changefreq: "hourly" },
    { path: "/legal", priority: "0.35", changefreq: "monthly" },
    ...PASOS.filter((p) => p.active).map((p) => ({
      path: `/${p.slug}`,
      priority: "0.9",
      changefreq: "hourly" as const,
    })),
  ];

  const body = paths
    .map((p) => url(`${base}${p.path}`, p.priority, p.changefreq, lm))
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${body}
</urlset>`;

  return new Response(xml.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
