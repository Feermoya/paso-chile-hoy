# Paso Chile Hoy

Web informativa para consultar el estado del Paso Cristo Redentor / Los Libertadores entre Mendoza y Chile, con foco en claridad, rapidez y futura automatización mediante fuentes oficiales, clima y alertas.

## Stack actual

- [Astro](https://astro.build/)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/)

## Objetivo actual

Mostrar en la home datos **reales** del detalle público de pasos en Argentina.gob.ar (HTML → snapshot → API / SSR), sin inventar estado operativo (abierto/cerrado).

## Visión futura

- Más pasos en catálogo y mejor multi-paso en UI
- Otras fuentes cuando haya contrato claro
- Alertas y requisitos enriquecidos (sin suposiciones)

## Requisitos

- Node.js **18.x** (alineado con `engines` y build en Vercel)

## Despliegue (Vercel)

- Conectá el repo en [Vercel](https://vercel.com): framework **Astro**, build `npm run build`, sin config extra (usa `@astrojs/vercel`).
- Variables: `PUBLIC_SITE_URL`, `PUBLIC_SITE_NAME` (ver [`.env.example`](.env.example)).
- Los datos en producción salen de **`public/snapshots/<slug>.json`** (versionados en Git).

## Scripts

| Comando       | Descripción                |
| ------------- | -------------------------- |
| `npm install` | Instala dependencias       |
| `npm run dev` | Servidor de desarrollo     |
| `npm run build` | Compila para producción (`astro check` + build) |
| `npm run preview` | Previsualiza el build localmente |
| `npm run scrape` | Descarga HTML, parsea y guarda `public/snapshots/<slug>.json` (pasos activos) |
| `npm run update:pass -- <slug>` | Atajo vía job (mismo parser) |
| `npm run update:all-passes` | Igual para todos los pasos configurados |

## Actualización periódica

GitHub Actions (`.github/workflows/scrape.yml`) ejecuta **`npm run scrape`** cada **15 minutos**, hace commit de `public/snapshots/` y empuja al repo; Vercel redeploya con el nuevo commit. En local podés usar `npm run scrape` o `update:all-passes`. Más detalle en [`docs/scheduler.md`](docs/scheduler.md).

## Depuración

Variable opcional `DEBUG_PASSES=1` (o `true`): vuelca `PassRaw` / `PassView` en consola al atender la API o la home. Ver [`.env.example`](.env.example). No dejar activa en producción.

## Documentación

- [`docs/home.md`](docs/home.md) — bloques de la home y qué campos consume
- [`docs/data-model.md`](docs/data-model.md) — RAW vs VIEW y mapper
- [`docs/design/`](docs/design/) — tokens, tipografía, componentes y principios visuales

## Estado del proyecto

Pipeline de scraping y snapshots operativo; la home prioriza datos reales y una presentación neutra frente al estado del paso.

## Estructura (resumen)

- `src/layouts` — layouts y shell de página
- `src/components/ui` — piezas de interfaz genéricas
- `src/components/pass` — bloques de la home / paso (hero, clima, operativa, etc.)
- `src/components/pass-status` — componentes heredados (no usados en la home actual)
- `public/snapshots` — JSON persistido (`PassRaw`), leído por el SSR en producción
- `src/types` — modelos TypeScript (RAW / VIEW / legado UI)
- `src/utils` — formateo y helpers de presentación
- `src/lib/server` — fetch HTML, parser, snapshots, API

## Licencia

Privado (repositorio `paso-chile-hoy`).
