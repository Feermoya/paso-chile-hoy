# Modelo de datos — Paso Chile Hoy

Contrato entre **ingesta** (HTML → snapshot) y **UI** (Astro). Objetivo: cero ambigüedad y escalabilidad a más pasos.

## RAW vs VIEW

| Capa | Archivo | Rol |
|------|---------|-----|
| **RAW** | `src/types/pass-raw.ts` | Lo que puede existir después del scraping / JSON persistido. Casi todo opcional salvo la validación de `slug` antes de mapear. Refleja la realidad incompleta del HTML. |
| **VIEW** | `src/types/pass-view.ts` | Lo que consume la interfaz: nombres estables, arrays normalizados, sin cadenas vacías (se usan `undefined`). |

El **mapper** (`src/lib/mappers/passViewMapper.ts`) es la única puerta recomendada RAW → VIEW.

## Estado operativo (abierto / cerrado)

El HTML oficial **no expone** un campo estructurado y fiable de “estado del paso”. Por eso:

- **No** hay `status` en `PassView`.
- **No** el mapper infiere abierto/cerrado ni genera textos al respecto.

Si en el futuro se incorpora una fuente explícita (otro campo en RAW con procedencia clara), se documentará aquí y se añadirá al VIEW de forma acotada.

## Campos principales

### Identificación (`PassRaw` / `PassView`)

- **`slug`**: identificador del proyecto (config). Obligatorio al mapear.
- **`routeId`**: id en la URL `/detalle/ruta/{id}/…` cuando se conoce.
- **`name` (RAW)** → **`title` (VIEW)**: nombre visible; si falta, `title === slug`.

### Ubicación

- **`provinceAR`**, **`countryCL`**, **`localityAR`**, **`localityCL`**, **`routeDescription`**: opcionales; en VIEW viven bajo `location.*`.

### Operación (sin estado)

- **`schedule`**, **`scheduleFrom`**, **`scheduleTo`**: horario en bruto o parseado; muchos formatos posibles (“cerrado (siempre).”, “24 hs”, etc.).
- **`contact`**: teléfono + `tel:` href.
- **`gps`**: lat/lng + enlace `geo:`.

### Alertas

- **`alerts[]`**: bloques tipo “Atención”. En VIEW siempre es array (vacío si no hay datos). Entradas totalmente vacías se descartan.

### Clima

- **`currentWeather`**: ahora; opcional.
- **`forecast[]`**: 0..N períodos (no se asume siempre 4).
- En VIEW, **`weather`** solo existe si hay al menos “ahora” o al menos un ítem de pronóstico; dentro, **`forecast`** es siempre array (posiblemente vacío si solo hay “ahora”).

Visibilidad: en RAW puede ser **`visibilityKm`** y/o **`visibilityText`** (cuando no es numérica).

### Links y proveedores

- **`usefulLinks`**: en VIEW solo entran ítems con **`text`** definido; **`url`** opcional.
- **`providers`**: en VIEW solo entran ítems con **`name`** definido; fechas ISO opcionales + texto crudo opcional.

### Meta

- **`scrapedAt`**: instante del scraping (UTC recomendado).
- **`sourceUrl`**: URL de la página fuente.

## Opcionalidad y arrays

- En **RAW**, la mayoría de campos son `string | undefined` o objetos opcionales; arrays pueden faltar.
- En **VIEW**, donde el mapper normaliza: **`alerts`**, **`usefulLinks`**, **`providers`**, y **`weather.forecast`** son arrays definidos (posiblemente vacíos).

## Validación

- `mapPassRawToView(raw)` exige `raw` definido y `raw.slug` no vacío tras `trim`; si falta `raw`, lanza `PASS_RAW_MISSING`; si falta slug válido, `PASS_RAW_INVALID_SLUG`.
- Si `raw` es `null`/`undefined` pero se conoce el slug de contexto (p. ej. de la ruta), usar `mapPassRawToViewSafe(raw, fallbackSlug)` (requiere `fallbackSlug` no vacío tras trim) para obtener `emptyPassView`.
- `emptyPassView(slug)` solo acepta slug válido; no incluye bloque `weather` (no se asume clima sin datos).

## Escalar a nuevos pasos

1. Añadir entrada en `src/lib/server/config/passes.ts` (slug + URL).
2. Asegurar que el pipeline de ingesta rellene **`PassRaw`** (o un adaptador HTML → `PassRaw`).
3. La UI solo consume **`PassView`** vía `mapPassRawToView`.

Nuevos campos del HTML: primero ampliar **`PassRaw`** y documentarlos aquí; luego decidir si pasan a **`PassView`** y cómo se mapean (sin inventar valores).

## Relación con el snapshot en disco

El parser (`argentinaPassParser`) persiste **`PassRaw`** en `data/snapshots/<slug>.json`. Los archivos antiguos en formato **`PassPageSnapshot`** se migran al leer (`jsonSnapshotStore`). En build estático, las páginas usan **`PassView`** vía `getSnapshotForApi` + `mapPassRawToView`.

## Ejemplo

Ver `src/lib/mappers/__examples__/cristo-redentor.example.ts`: un `PassRaw` realista y el `PassView` generado.
