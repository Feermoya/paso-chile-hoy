# Actualización periódica de snapshots

El sitio lee datos desde JSON en `data/snapshots/<slug>.json`, generados por el scraper. Para que la información no quede obsoleta, hay que ejecutar periódicamente:

```bash
npm run update:all-passes
```

Equivalente por paso:

```bash
npm run update:pass -- cristo-redentor
```

## Frecuencia recomendada

- **10 minutos:** alineado con `snapshotFreshMs` en `src/lib/server/config/snapshotPolicy.ts` (la API intenta refrescar desde red si el archivo supera esa antigüedad).
- **15 minutos:** aceptable si querés menos carga sobre argentina.gob.ar o límites del plan de hosting.

No hace falta coincidir al segundo: el snapshot en disco se reutiliza si la red falla.

## Astro / Node sin cron interno

El proyecto **no** arranca un demonio ni cron por sí mismo. En producción conviene:

1. **Cron del sistema** (Linux/VPS), **launchd** (macOS servidor), o **systemd timer**.
2. **Panel del proveedor** (tareas programadas / “Cron jobs”).
3. **CI programado** (GitHub Actions, GitLab CI, etc.) que clone el repo, instale dependencias, ejecute el script y **persista** `data/snapshots/` (por ejemplo commit a rama, artefacto, o volumen compartido con el contenedor que sirve el sitio).

### Ejemplo crontab (cada 10 minutos)

```cron
*/10 * * * * cd /ruta/al/proyecto && /usr/bin/env PATH="/ruta/node/bin:$PATH" npm run update:all-passes >> /var/log/paso-chile-hoy-update.log 2>&1
```

Ajustá la ruta de Node/npm según tu instalación (`which node`).

### Variables de entorno

- `DEBUG_PASSES=1` — solo para depurar; vuelca PassRaw/PassView en consola al usar la API o la home con el logger de debug. **No** dejar en producción.
