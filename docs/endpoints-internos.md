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
| GET | `/api/snapshot/[slug]` | `api/snapshot/[slug].ts` | Payload JSON para refresh cliente / coherencia de estado (`inferPassStatus`, `statusLabel`) |
| * | `/api/data/[slug]` | `api/data/[slug].ts` | Datos derivados del consolidado + clima (uso interno / debug; revisar antes de exponer) |

Si existe **`SCRAPE_SECRET`** en el entorno, los endpoints que lo requieran validan header (ver comentarios en cada handler).

## Archivos estáticos relevantes

| Recurso | Ubicación |
|---------|-----------|
| Snapshots | `public/snapshots/*.json` |
| `manifest.json`, `robots.txt`, `sw.js` | `public/` |

## Variables de entorno útiles

| Variable | Uso |
|----------|-----|
| `PUBLIC_SITE_URL` | URLs canónicas y OG |
| `DEBUG_PASS` | Logs detallados en `[slug].astro` (SSR) |
| `DEBUG_PASSES` | Logs voluminosos RAW/VIEW (`passDebugLog.ts`) |
| `SCRAPE_SECRET` | Protección opcional de rutas de scrape |

Copiar desde `.env.example`; en local usar `.env.local` (no commitear).

## GitHub Actions

- **Workflow:** `.github/workflows/scrape.yml`
- **Comando:** `npx tsx scripts/scrape.ts`
- **Salida:** commit de `public/snapshots/` si hay cambios (`[skip ci]` opcional en el mensaje).

---

Para el flujo completo lectura → UI, ver **`docs/flujo-de-datos.md`**.
