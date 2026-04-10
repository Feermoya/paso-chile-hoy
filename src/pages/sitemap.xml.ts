import type { APIRoute } from "astro";
import { PASOS } from "@/data/pasos";

export const prerender = true;

function siteOrigin(): string {
  const env = import.meta.env.PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.SITE) return String(import.meta.env.SITE).replace(/\/$/, "");
  return "https://pasochilehoy.com";
}

export const GET: APIRoute = () => {
  const base = siteOrigin();
  const urls = [
    { loc: `${base}/`, priority: "1.0", changefreq: "hourly" as const },
    ...PASOS.filter((p) => p.active).map((p) => ({
      loc: `${base}/${p.slug}`,
      priority: "0.9",
      changefreq: "hourly" as const,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
