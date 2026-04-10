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

- Node.js **18.14.1** o superior (recomendado LTS actual)

## Scripts

| Comando       | Descripción                |
| ------------- | -------------------------- |
| `npm install` | Instala dependencias       |
| `npm run dev` | Servidor de desarrollo     |
| `npm run build` | Compila para producción (`astro check` + build) |
| `npm run preview` | Previsualiza el build localmente |
| `npm run update:pass -- <slug>` | Descarga HTML, parsea y guarda `data/snapshots/<slug>.json` |
| `npm run update:all-passes` | Igual para todos los pasos configurados |

## Actualización periódica

El sitio **no** incluye cron interno. Para datos frescos, programá `npm run update:all-passes` cada **10–15 minutos** con el scheduler del host (cron, systemd, panel, GitHub Actions, etc.). Detalle y ejemplo en [`docs/scheduler.md`](docs/scheduler.md).

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
- `data/snapshots` — JSON persistido (`PassRaw`)
- `src/types` — modelos TypeScript (RAW / VIEW / legado UI)
- `src/utils` — formateo y helpers de presentación
- `src/lib/server` — fetch HTML, parser, snapshots, API

## Licencia

Privado (repositorio `paso-chile-hoy`).
