# Endpoints y rutas internas (Paso Chile Hoy)

Referencia para integraciones y depuración. Base: mismo origen que el sitio (p. ej. `https://pasochilehoy.com`).

## Páginas Astro (SSR)

| Ruta | Archivo | `prerender` |
|------|---------|-------------|
| `/` | `src/pages/index.astro` | `false` |
| `/{slug}` | `src/pages/[slug].astro` | `false` |
| `/legal`, `/404`, `/500` | respectivos en `src/pages/` | según archivo |

Las páginas de paso cargan datos con `getSnapshotForApi` en el servidor (ver `docs/flujo-de-datos.md`).

## API routes (`src/pages/api/`)

| Método | Ruta | Archivo | Propósito |
|--------|------|---------|-----------|
| GET | `/api/snapshot/[slug]` | `api/snapshot/[slug].ts` | Último snapshot + envelope (`PassSnapshotApiEnvelope`: `view`, `statusResult`, `stale`, etc.). Para **`cristo-redentor`** puede incluirse también `cristoRisk` (riesgo informativo v1; ver [`cristo-redentor-risk-v1.md`](./cristo-redentor-risk-v1.md)). |
| POST | `/api/snapshot/[slug]` | `api/snapshot/[slug].ts` | Tras `verifyRefreshPostAuth`: refresca y persiste; si falla puede devolver 200 con último JSON y `refreshFailed`. |
| POST | `/api/refresh/[slug]` | `api/refresh/[slug].ts` | Refresh estricto: **200 solo si** el scrape + persistencia OK; si no, **503**. |
| GET | `/api/data/[slug]` | `api/data/[slug].ts` | `fetchConsolidado` + `fetchClima` → `mapToSnapshot` **sin** pronóstico HTML ni wttr. Uso debug; **la UI no lo usa**. |
| GET/POST | `/api/likes` | `api/likes.ts` | Contador de likes en Redis (Upstash). |
| GET | `/api/cron/twitter-refresh` | `api/cron/twitter-refresh.ts` | Actualización tweets; requiere `CRON_SECRET` (Bearer o query). |

**POST** de snapshot/refresh: si existe **`SCRAPE_SECRET`**, `verifyRefreshPostAuth` exige header `x-scrape-secret` **o** petición same-origin; si el secreto **no** está definido, el POST queda **sin** esa capa (útil solo en local). Ver `src/lib/server/refreshPostAuth.ts`.

## Archivos estáticos relevantes

| Recurso | Ubicación |
|---------|-----------|
| Snapshots | `public/snapshots/*.json` |
| `manifest.json`, `robots.txt`, `sw.js` | `public/` |

## Metadatos SSR (OG / Twitter)

Ver `src/utils/seo.ts`: tipo `LayoutSeoBundle`, `DEFAULT_OG_IMAGE`, `SITE_FAVICON` y builders por página. El `<head>` se arma en `MainLayout.astro` solo con props (sin JS cliente).

## Variables de entorno útiles

| Variable | Uso |
|----------|-----|
| `PUBLIC_SITE_URL` | URLs canónicas y OG |
| `DEBUG_PASS` | Logs detallados en `[slug].astro` (SSR) |
| `DEBUG_PASSES` | Logs voluminosos RAW/VIEW (`passDebugLog.ts`) |
| `SCRAPE_SECRET` | Protección opcional de POST `/api/snapshot` y `/api/refresh` |
| `CRON_SECRET` | `/api/cron/twitter-refresh` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Redis Upstash: snapshots + likes en Vercel |

Copiar desde `.env.example`; en local usar `.env.local` (no commitear).

## GitHub Actions

- **Workflow:** `.github/workflows/scrape.yml`
- **Comando:** `npx tsx scripts/scrape.ts`
- **Salida:** commit de `public/snapshots/` si hay cambios (`[skip ci]` opcional en el mensaje).

---

Para el flujo completo lectura → UI, ver **`docs/flujo-de-datos.md`**, **`docs/backend.md`**, **`docs/scrape.md`**.
