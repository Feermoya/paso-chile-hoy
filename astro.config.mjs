import path from "node:path";
import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: "hybrid",
  adapter: node({ mode: "standalone" }),
  integrations: [tailwind({ applyBaseStyles: false }), icon()],
  /* Al publicar: definí `site` con tu dominio para canonical, Open Graph y sitemaps. */
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
});
