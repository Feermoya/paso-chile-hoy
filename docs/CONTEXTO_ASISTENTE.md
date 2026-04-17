Aquí tienes un **brief de contexto para Claude** (o cualquier otro asistente): qué existe, dónde está y cómo encaja, para tocar lo mínimo y no duplicar lógica.

---

## 1. Stack y convenciones

- **Astro 4+**, **TypeScript**, **Tailwind** + **`src/styles/global.css`** (mucho CSS “de producto” en `@layer components` y reglas sueltas).
- **SSR**: `src/pages/[slug].astro` tiene `export const prerender = false` → datos del paso se resuelven **en request** vía `getSnapshotForApi(slug)`.
- **Fuentes de verdad**: el estado operativo viene del **snapshot JSON** persistido + mapeo a `PassView`; la inferencia de badge/UI usa **`inferPassStatus(view)`**.

---

## 2. Flujo de datos (orden mental)

```
public/snapshots/{slug}.json
  → getSnapshotForApi (snapshotService / jsonSnapshotStore)
  → mapPersistedSnapshotToView(raw, pasoConfig)  [passViewMapper]
  → PassView
  → inferPassStatus(view)  → status, displayLabel, closesInMinutes, …
  → Componentes (StatusHero, AlertsBlock, …)
```

- **`PassView`**: `src/types/pass-view.ts` (incluye `operationalInfo`, `weather`, `forecast`, `meta.latestTweet`).
- **No inventar camores**: si algo no está en el tipo o en el mapper, no asumir que existe en el JSON.
- **Documentación extendida del pipeline**: `docs/flujo-de-datos.md`, `docs/endpoints-internos.md`, `docs/backend.md`, `docs/scrape.md`, `docs/scheduler.md`.
- **Cristo Redentor — motor de riesgo informativo (v1, solo backend/payload)**: `docs/cristo-redentor-risk-v1.md`; roadmap de siguientes etapas: `docs/risk-engine-roadmap.md`.

---

## 3. Páginas y layout

| Archivo | Rol |
|--------|-----|
| `src/layouts/MainLayout.astro` | `<html>`, meta, PWA, **`header` + `site-header`**, **`ticker-wrapper` + AlertTicker**, `<main>` con `<slot />`, scripts (SW, altura header, pull-refresh). |
| `src/pages/[slug].astro` | Orquesta datos (snapshot, meta, JSON-LD). El markup por sección vive en **`src/components/pass-page/`** (`PasoPageShell`, columnas, error, SEO). |
| `src/pages/index.astro` | Home: cards por paso, otro uso de SupportBlock; **no** repite el grid de `[slug].astro`. |

**Importante**: `WeatherForecast` y `WeatherNow` se montan desde **`PasoWeatherSection.astro`** (columna sticky del paso).

**`src/components/pass-page/`** (página de cada paso): `PasoPageVersionRow`, `PasoPageLoadError`, `PasoOperationalSection`, `PasoWeatherSection`, `PasoFullwidthSection`, `PasoPageShell` (wrapper grid + fullwidth), `PasoPageSeoBlock`. Estilos por bloque: clases con prefijo `paso-page-*` en cada `.astro` para poder afinar sin tocar `[slug].astro`.

---

## 4. Componentes clave (qué hace cada uno)

| Componente | Responsabilidad | Props / notas |
|-------------|-----------------|----------------|
| **`StatusHero.astro`** | Badge grande de estado, horario, countdown, refresh → API. | `status`, `displayLabel?`, `slug`, etc. El texto del badge usa `displayLabel ?? labels[status]`. Script cliente usa `/api/snapshot/:slug` y `statusLabel`. |
| **`AlertsBlock.astro`** | Alertas estilo gob.ar: **vialidad** (título armado) + **tarjeta de `motivo`** (Gendarmería). | **No** lee `demoras` como campo aparte: lo que llega como “demoras” en API suele mapearse a **`motivo`** en el snapshot. Filtra horario genérico y `-.-`. |
| **`WeatherNow.astro`** | “Ahora”: ícono + stats. Color del ícono: **`style={{ color: iconColor }}` en `<Icon>`** (`getWeatherIconColor` en el **Icon**, no en el wrapper). | Prop `includeDriving`: si `false`, no renderiza `DrivingConditions` dentro (se usa en `[slug]` y va en `paso-fullwidth`). |
| **`WeatherForecast.astro`** | Pronóstico en `<details class="fcard">`. Color: **`fcardIconWrapStyle()`** en el **`<span class="fcard-icon-wrap">`** con `color` + `background-color` (hex+`1a` o `color-mix`). | Helper `getForecastDate`; opcional `period.date` en tipo. Script abre/cierra `details` según viewport. |
| **`DrivingConditions.astro`** | Alerta de manejo (frío, viento, etc.); puede ser `null`. | Clases animación globales + scoped `.driving-conditions`. |
| **`PassDetails.astro`** | Detalle del paso / proveedores. | En `[slug]` va en **`paso-fullwidth`**, no en la columna sticky. |
| **`SupportBlock.astro`** | Donaciones. | En `[slug]` está **dentro** de `paso-fullwidth`; en **index** sigue debajo del grid de cards. |
| **`AlertTicker.astro`** | Ticker “EN VIVO”: en **build del servidor** lee **`readPassSnapshotFile`** por paso + `inferPassStatus`. | No es tiempo real contra API; es **JSON en disco** en el momento del render. |
| **`StatusGuide.astro`** | Guía colapsable de significado de estados. | Home + página paso. |
| **`LatestTweet.astro`**, **`TwitterAlerts.astro`** | Twitter complementario. | |

---

## 5. Utilidades que no duplicar

| Archivo | Uso |
|---------|-----|
| **`src/utils/weatherIcon.ts`** | `getWeatherIcon`, `getWeatherIconColor` → **solo hex `#RRGGBB`** para colores de íconos climáticos. |
| **`src/utils/inferPassStatus.ts`** | Reglas de badge: `ABIERTO` + vialidad CORTE/RESTRINGIDA → `condicionado` + `displayLabel: 'ABIERTO'`; `CERRADO` → `cerrado` sin mirar `fecha_schema` en esta ruta. |
| **`src/utils/heroScheduleFromView.ts`** | Texto de horario en hero. |
| **`src/pages/api/snapshot/[slug].ts`** | Payload de refresh: `statusLabel` debe alinear con `displayLabel` cuando exista. |

---

## 6. CSS: dónde está qué

- **`src/styles/global.css`**: layout **`.paso-page-wrapper`**, **`.paso-grid`**, **`.paso-col`**, **`.paso-col--sticky`** (sticky + **`max-height` + `overflow-y: auto`** → scroll interno columna derecha), **`.forecast-section` / `.fcard-*`**, alertas **`.alert-card-*`**, ticker **`.ticker-wrapper`**, animaciones varias.
- **Componentes**: estilos `<style>` locales (ej. `DrivingConditions`, `AlertTicker`, `StatusHero` parcial).

**Evitar**: definir otra vez el mismo grid de paso en un segundo archivo; **un solo lugar** para `.paso-col--sticky`.

---

## 7. Snapshots JSON

- Ruta típica: **`public/snapshots/{slug}.json`**.
- Deben ser **JSON válido** (sin conflictos de merge `<<<<<<<`).
- Campos frecuentes: `rawStatus`, `motivo`, `vialidadEstado`, `vialidadObservaciones`, `vialidadRuta`, `vialidadTramo`, `weather`, `forecast`, `scrapedAt`.

---

## 8. Errores frecuentes a evitar

1. **Duplicar** lógica de estado: siempre **`inferPassStatus`** + API snapshot, no reimplementar en UI.
2. **Confundir** `motivo` con un campo `demoras` separado en `AlertsBlock` — hoy la UI de alerta de texto operativo es **`motivo`**.
3. **Íconos**: `WeatherNow` pone color en **`Icon`**; `WeatherForecast` en el **wrapper** — comportamientos distintos a propósito; no unificar sin revisar `astro-icon` / SVG.
4. **Sticky + scroll**: el scroll interno del pronóstico puede venir de **`.paso-col--sticky`**, no solo de `.fcard`.
5. **Ticker desactualizado**: refleja **archivos snapshot**, no el API en vivo.

---

## 9. Checklist antes de tocar algo

- [ ] ¿El cambio es solo visual? → `global.css` o el `.astro` del componente.
- [ ] ¿Cambia el significado del “estado del paso”? → `inferPassStatus.ts` + tipos + API snapshot si aplica.
- [ ] ¿Nuevo campo del JSON? → `pass-raw` / mapper / `PassView` / componente (todo el pipeline).
- [ ] Tras editar: `npm run build` y `astro check`.

---

Podés copiar y pegar este bloque tal cual en un chat con Claude como **contexto de arquitectura**. Si querés, en un siguiente mensaje lo podemos volcar a un archivo fijo del repo (por ejemplo `docs/ARCHITECTURE.md`) para versionarlo.
