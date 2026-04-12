import type { APIRoute } from "astro";
import { PASOS } from "@/data/pasos";
import { SITE_URL } from "@/utils/seo";

export const prerender = true;

function url(path: string, priority: string, changefreq: string, lastmod?: string) {
  return `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

export const GET: APIRoute = () => {
  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${url("/", "1.0", "hourly", today)}
${PASOS.filter((p) => p.active)
  .map((p) => url(`/${p.slug}`, "0.9", "hourly", today))
  .join("")}
</urlset>`;

  return new Response(xml.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
