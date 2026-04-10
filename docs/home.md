# Home — bloques y datos

La página `src/pages/index.astro` (SSR) usa `getSnapshotForApi` → `mapPassRawToView` → componentes visuales nuevos.

## Orden vertical

1. **StatusHero** — Estado inferido (`inferPassStatus`), nombre del paso, horario publicado, “hace X min” del snapshot, enlace oficial. Colores semáforo.
2. **WeatherNow** — `weather.now` si hay datos mostrables.
3. **Próximas horas** — `weather.forecast` en grid.
4. **AlertsBlock** — Solo si hay alertas.
5. **PassDetails** — Horario, contacto, GPS, enlaces, proveedores, snapshot (si aplica).

## Inferencia de estado

Ver `src/utils/inferPassStatus.ts` y `docs/design/principles.md`. No forma parte del contrato `PassView` scrapeado.

## Diseño

Especificación visual: `docs/design/*`.
