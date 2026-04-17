# Actualización periódica de snapshots

## Dónde están los JSON

Los snapshots que consume la app están en **`public/snapshots/{slug}.json`** (no en `data/snapshots/`). El lector unificado es `readPassSnapshot` → archivo y/o Redis (`src/lib/server/storage/passSnapshotStore.ts`).

> **Histórico:** `docs/scheduler.md` mencionaba antes `data/snapshots/`; eso estaba **desalineado** con el código. Si existe `data/snapshots/*.json` en el repo, es **ajeno** al pipeline actual salvo uso manual.

## Dos modos de frecuencia (no son lo mismo)

### 1) GitHub Actions (lo definido en el repo)

El workflow **`.github/workflows/scrape.yml`** ejecuta **`npx tsx scripts/scrape.ts`** **tres veces al día** (cron UTC en el YAML). Eso actualiza el repo con commits a `public/snapshots/` cuando hay cambios.

Ver detalle en [`scrape.md`](./scrape.md).

### 2) Ventana de “frescura” para refresh en vivo (`snapshotPolicy.ts`)

- **`snapshotFreshMs`** = 10 minutos: en **desarrollo local** (sin `VERCEL`), `getSnapshotForApi` puede disparar `refreshAndPersistSnapshot` si el JSON en disco es más viejo que esa ventana.
- Documentación de referencia: **`snapshotFreshMinutes`** en el mismo archivo.

Eso **no** obliga a un cron cada 10 min: es la política **si** algo llama a `getSnapshotForApi` en un entorno que permite scrape en vivo. En **Vercel** el comportamiento añade la rama de snapshot > **120 min** (ver `snapshotService.ts`).

### 3) Cron propio / panel del host

Podés programar `npm run update:all-passes` o `npm run scrape` cada 10–15 minutos en un servidor con filesystem escribible y/o Redis; es **independiente** del schedule de GitHub Actions.

## Comandos

```bash
npm run scrape
# o
npm run update:all-passes
```

Equivalente por paso: `npm run update:pass -- cristo-redentor`.

## Astro / Node sin cron interno

El proyecto **no** arranca un demonio ni cron por sí mismo. Opciones: cron del SO, panel del proveedor, CI programado, o tráfico que dispare refresh en Vercel según la lógica de `getSnapshotForApi`.

### Ejemplo crontab (cada 10 minutos, servidor propio)

```cron
*/10 * * * * cd /ruta/al/proyecto && /usr/bin/env PATH="/ruta/node/bin:$PATH" npm run update:all-passes >> /var/log/paso-chile-hoy-update.log 2>&1
```

## Variables de entorno

- `DEBUG_PASSES=1` — depuración voluminosa; **no** dejar en producción.

## Más lectura

- [`scrape.md`](./scrape.md) — workflows, fuentes por paso, fallos.
- [`backend.md`](./backend.md) — Redis vs archivo, APIs, capas.
