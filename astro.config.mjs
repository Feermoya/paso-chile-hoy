import path from "node:path";
import { fileURLToPath } from "node:url";
import vercel from "@astrojs/vercel/serverless";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: "https://pasochilehoy.com",
  output: "server",
  adapter: vercel({
    functionPerRoute: false,
    edgeMiddleware: false,
    imageService: false,
    devImageService: "sharp",
    webAnalytics: { enabled: false },
    speedInsights: { enabled: false },
  }),
  /** Canonical en producción: apex + `PUBLIC_SITE_URL`. Redirección www → apex en `middleware.ts`. */
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
