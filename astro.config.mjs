import path from "node:path";
import { fileURLToPath } from "node:url";
import vercel from "@astrojs/vercel/serverless";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: "server",
  adapter: vercel({
    functionPerRoute: false,
    edgeMiddleware: false,
    imageService: false,
    devImageService: "sharp",
    webAnalytics: { enabled: false },
    speedInsights: { enabled: false },
  }),
  /** Sin `site` fijo: evita URLs absolutas al apex en HTML servido desde www (CORS en `/_app/*`). Canonical vía `PUBLIC_SITE_URL` / `seo.ts`. */
  compressHTML: true,
  server: {
    host: false,
  },
  build: {
    assets: "_app",
  },
  integrations: [tailwind({ applyBaseStyles: false }), icon()],
  vite: {
    /**
     * Reduce errores `504 Outdated Optimize Dep` / imports del dev-toolbar en dev.
     * Si persisten: `npm run dev:fresh` (borra caché de Vite) o reiniciar el servidor.
     */
    optimizeDeps: {
      include: ["html-to-image", "aria-query", "axobject-query"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      sourcemap: false,
    },
    server: {
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
      },
    },
  },
});
