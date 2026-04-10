/**
 * Política de frescura de snapshots persistidos.
 *
 * La API usa `snapshotFreshMs`: si el JSON en disco es más viejo, intenta refrescar
 * desde la fuente; si falla, sirve el último snapshot guardado.
 *
 * **Scheduler externo (recomendado):** ejecutá `npm run update:all-passes` cada **10–15 minutos**
 * (10 min alinea con esta ventana; 15 min reduce carga si el hosting lo pide). Astro/Node no
 * incluye cron interno: usá cron del SO, panel del host, systemd timer o GitHub Actions.
 * Ver `docs/scheduler.md`.
 */
export const snapshotFreshMs = 10 * 60 * 1000;

/** Minutos; referencia documental para alinear cron con `snapshotFreshMs`. */
export const snapshotFreshMinutes = snapshotFreshMs / 60_000;
