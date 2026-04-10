/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Sora", "DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        page: {
          DEFAULT: "var(--color-bg-base)",
          secondary: "var(--color-bg-secondary)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          overlay: "var(--color-surface-overlay)",
        },
        ink: {
          DEFAULT: "var(--color-text-primary)",
          muted: "var(--color-text-secondary)",
          faint: "var(--color-text-muted)",
        },
        line: "var(--color-border-default)",
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
        },
        copper: {
          DEFAULT: "var(--color-copper)",
          soft: "var(--color-copper-soft)",
          subtle: "var(--color-copper-subtle)",
        },
        pass: {
          open: "var(--color-open)",
          conditional: "var(--color-conditional)",
          closed: "var(--color-closed)",
          unknown: "var(--color-unknown)",
        },
        status: {
          open: "var(--color-open)",
          closed: "var(--color-closed)",
          conditional: "var(--color-conditional)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        status: "var(--shadow-status)",
      },
    },
  },
  plugins: [],
};
