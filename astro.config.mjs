import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: "static",
  /* Cambiá al dominio real de Firebase Hosting para canonical, OG y URLs absolutas. */
  site: "https://pasochilehoy.com",
  integrations: [tailwind({ applyBaseStyles: false }), icon()],
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
});
