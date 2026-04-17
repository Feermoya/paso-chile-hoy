# Scrape y actualización de snapshots

## Comandos locales

| Script | Comando | Qué hace |
|--------|---------|----------|
| Scraper unificado | `npm run scrape` → `tsx scripts/scrape.ts` | `refreshAndPersistSnapshot` por cada slug en `listPassSlugs()` → escribe `public/snapshots/{slug}.json` (y Redis si aplica). |
| Actualizar un paso | `npm run update:pass -- <slug>` | Ver `scripts/update-pass.mjs`. |
| Todos los pasos (mismo núcleo que scrape) | `npm run update:all-passes` → `scripts/update-all-passes.mjs` | Invoca `runUpdateAllPassSnapshots` (`src/lib/server/jobs/updatePassSnapshot.ts`). |

**Implementación compartida:** `refreshAndPersistSnapshot` en `src/lib/server/services/snapshotService.ts`.

## GitHub Actions (lo que corre “de verdad” en CI)

| Workflow | Cron (UTC) | Salida |
|----------|------------|--------|
| `.github/workflows/scrape.yml` | `30 7`, `23 15`, `41 21` (**3 veces al día**) | `npx tsx scripts/scrape.ts` → commit `public/snapshots/*.json` si cambia. |
| `.github/workflows/route-segments.yml` | `17 10`, `23 15`, `41 21` | `scripts/update-route-segments.ts` → `public/snapshots/rutas/*.json`. |
| `.github/workflows/keep-alive.yml` | (ver archivo) | keep-alive / ping. |
| `.github/workflows/release.yml` | tags | release. |

Eso **no** equivale a cada 10 minutos: la recomendación de `snapshotPolicy.ts` (10 min) describe **otro** modo de operación (cron propio o refresh en vivo), no el schedule de GHA.

## Frescura en runtime (Vercel / dev)

- `snapshotFreshMs` = 10 min (`src/lib/server/config/snapshotPolicy.ts`): en **dev** sin `VERCEL`, `getSnapshotForApi` intenta refrescar si el archivo supera esa edad.
- En **producción Vercel**, el archivo del deploy puede servir de base; si el JSON tiene **> 120 min** (`SNAPSHOT_STALE_MAX_MINUTES` en `snapshotService.ts`), se intenta `refreshAndPersistSnapshot` en vivo (requiere Redis para persistir en Vercel).

## Fuentes por paso (scrape)

| Slug | Estado operativo | Clima | Pronóstico |
|------|------------------|-------|------------|
| `cristo-redentor` | `fetchConsolidado` + HTML | `fetchClima` | HTML `parseForecastFromHTML` |
| `pehuenche` | igual | igual | igual |
| `agua-negra` | Scrape San Juan `scrapeAguaNegraStatus` | wttr primero; fallback `fetchClima` | wttr; si vacío, HTML ruta 27 |

## Si falla una corrida

- **GHA:** no hay commit; el repo conserva el último JSON bueno.
- **GET `/api/snapshot`:** devuelve último snapshot persistido (Redis o archivo) con `stale` / `refreshFailed` según el handler.
- **Pehuenche/Cristo:** si falla consolidado, snapshot de error parcial con `operationalStale` / `SIN_DATOS` según `cristoRedentorSnapshot` / `pehuencheSnapshot`.
