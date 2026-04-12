# Estado de la ruta RN 7 en la home (Cristo Redentor)

Documento de contexto para mantenimiento, revisión de bugs o mejoras (humano o asistente).

## Qué es

Sección en la **home** que muestra el estado por tramos de la **RN 7 (Mendoza)** hacia **Cristo Redentor**, usando datos ya filtrados del sheet nacional (infraestructura `route-segments`).

## Datos y contrato

- **Payload canónico:** `RouteSegmentsPayload` en `src/types/route-segments.ts`.
- **Lectura SSR:** `readRouteSegments("cristo-redentor")` en `src/lib/server/storage/routeSegmentsStorage.ts` (Redis si existe, si no archivo `public/snapshots/rutas/cristo-redentor.json`).
- **API (referencia):** `GET /api/rutas/cristo-redentor` — la home **no** la llama desde el cliente; solo SSR.

Si `readRouteSegments` devuelve `null`, la sección **no se renderiza** (home intacta).

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/pages/index.astro` | Tras la grilla de `PasoCard`, antes de `TwitterTimeline`: lee snapshot, arma `HomeCristoRouteView`, renderiza `HomeCristoRouteSegments`. |
| `src/components/HomeCristoRouteSegments.astro` | Markup de la sección (panel, resumen, timeline, CTA). |
| `src/lib/mappers/homeCristoRouteView.ts` | View-model: `reachLine`, badges, flags `isBlocking` / `isAfterBlocking` / `showNotes`. |
| `src/styles/global.css` | Estilos con prefijo **`.home-route-rn7`** y **`.hrr7-*`** (no mezclar con `.paso-card-v2`). |

## Lógica de presentación (view-model)

- **Primer tramo bloqueante:** primer segmento con estado `PARTIAL` o `CLOSED` (misma noción que `summary.firstBlockingSegmentId`).
- **Tramos “muted”:** índices **posteriores** al bloqueante (menor énfasis visual).
- **Notas:** solo si hay texto en `notes` y el tramo es **crítico** (`flags.critical`) o es el **bloqueante**.
- **`reachLine`:** derivada de `summary.canReachPass`, túnel internacional cerrado, e índice del bloqueante (ver comentarios en `homeCristoRouteView.ts`).

## Reglas de producto / copy

- Tono sobrio; sin alarmismo.
- Color de estado solo en **badges** y **puntos** del timeline, no fondos enteros chillones.
- CTA: `/cristo-redentor` — “Ver detalle del paso”.

## Actualización de datos

- Snapshot en repo: workflow `route-segments.yml` + script `npm run update:rutas`.
- Sin snapshot en deploy: la sección desaparece hasta que exista el JSON o Redis.

## Extensiones futuras

- Otros perfiles: reutilizar patrón `readRouteSegments(profile)` + mapper genérico o props de título/eyebrow/CTA.
- Vista detallada en página de paso: componente distinto; no acoplar este bloque a `PasoCard`.

## Posibles bugs a vigilar

- Desajuste entre nombres de tramo en el sheet y `expectedSegments` en `profiles.ts` → falla el script, snapshot viejo o ausente.
- `formatRelativeTimeAgo` con ISO inválido → línea de actualización genérica.
- Tema claro/oscuro: nuevos estilos deben cubrir `:root[data-theme="light"]` y el tema por defecto (oscuro).
