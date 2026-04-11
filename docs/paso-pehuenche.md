# Paso Pehuenche — Documentación de flujo de datos

## Estado actual del snapshot

```json
{
  "slug": "pehuenche",
  "name": "Pehuenche",
  "schedule": "09:00-19:00",
  "scheduleRaw": "HABILITADO PARA TODO TIPO DE TRANSPORTE DE 0800 A 1900 HS",
  "rawStatus": "ABIERTO",
  "motivo": null,
  "motivoInfo": null,
  "htmlAlerts": [],
  "vialidadRuta": "145",
  "vialidadTramo": "Cajón Grande - Lte. Internacional",
  "vialidadEstado": "HABILITADA",
  "vialidadObservaciones": "",
  "latestTweet": null,
  "weather": {
    "temperatureC": 13.4,
    "description": "Ligeramente nublado",
    "wind": "Sur 6 km/h",
    "visibilityKm": 20,
    "sunrise": "07:59",
    "sunset": "19:23",
    "updatedAt": "2026-04-11T10:00:00-03:00"
  },
  "contact": "(260) 4471063",
  "lat": -35.79497,
  "lng": -70.14326,
  "altitudeM": 2553,
  "scrapedAt": "2026-04-11T13:48:51.270Z",
  "forecast": [
    {
      "period": "Hoy por la tarde",
      "description": "Algo nublado",
      "temperatureC": 9,
      "wind": "O a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Hoy por la noche",
      "description": "Algo nublado",
      "temperatureC": 6,
      "wind": "NO a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Mañana por la madrugada",
      "description": "Despejado",
      "temperatureC": 0,
      "wind": "O a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Mañana por la mañana",
      "description": "Mayormente nublado",
      "temperatureC": 4,
      "wind": "N a 7-12 km/h",
      "visibility": "Buena"
    }
  ]
}
```

*(Contenido tomado de `public/snapshots/pehuenche.json` en el repo.)*

## Fuentes de datos

### Fuente 1: API consolidado Argentina.gob.ar

- **URL:** `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle_consolidado/ruta/32`
- **Tipo:** endpoint JSON
- **Se llama en:** `fetchConsolidado` en `src/lib/server/apiClient.ts` (aprox. 108–109), desde `refreshAndPersistSnapshot` en `src/lib/server/services/snapshotService.ts` (misma rama que Cristo Redentor, slug ≠ `agua-negra`).
- **Qué campos usa:** mismos que Cristo Redentor: `mapToSnapshot` en `src/lib/server/passMapper.ts` (aprox. 104–168).
- **Con qué frecuencia:** tres ejecuciones diarias del workflow (cron UTC en `.github/workflows/scrape.yml`: `17 10`, `23 15`, `41 21`) más ejecución manual.
- **Funciona en local:** sí.

### Fuente 2: HTML de detalle Argentina.gob.ar

- **URL:** `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/32/Pehuenche`
- **Tipo:** HTML scraping
- **Se llama en:** `fetchDetailHTML(32, "Pehuenche")` → `parseForecastFromHTML` + `extractAlertsFromDetailHTML` en `snapshotService.ts`.
- **Qué campos usa:** `forecast`, `htmlAlerts` (filtradas longitud > 8).
- **Con qué frecuencia:** cada refresh del snapshot.
- **Funciona en local:** sí.

### Fuente 3: API clima SMN (Argentina.gob.ar)

- **URL:** `.../detalle_clima/-35.79497/-70.14326`
- **Tipo:** endpoint JSON
- **Se llama en:** `fetchClima` en `apiClient.ts`; Pehuenche **no** usa wttr (`climaSource` por defecto ausente en `src/data/pasos.ts`).
- **Qué campos usa:** mismo bloque `weather` que en otros pasos nacionales.
- **Con qué frecuencia:** cada refresh.
- **Funciona en local:** sí.

## Flujo completo paso a paso

1. GitHub Actions ejecuta `npx tsx scripts/scrape.ts` según los **tres crons diarios** UTC definidos en `.github/workflows/scrape.yml` (no es un intervalo de minutos fijo).
2. `scripts/scrape.ts` itera slugs activos y llama `refreshAndPersistSnapshot("pehuenche")`.
3. Se obtienen consolidado + HTML en paralelo, se arma clima SMN, y **`mapToSnapshot`** produce el `PassSnapshot`.
4. **`writePassSnapshot`** guarda `public/snapshots/pehuenche.json` (si no es runtime Vercel sin escritura a disco; en Vercel con Redis, también KV).
5. En **`/pehuenche`**, `getSnapshotForApi` → `mapPersistedSnapshotToView` → `buildPassRefreshPayload` → **`inferPassStatus`**.

## Cómo se determina el estado (ABIERTO/CERRADO/CONDICIONADO)

- Igual que Cristo Redentor: con `rawStatus` no vacío, **`inferFromOfficialApi`** (`src/utils/inferPassStatus.ts`).
- **`CERRADO` / `CONDICIONADO`:** resultado directo desde `rawStatus` + `motivo` opcional.
- **`ABIERTO`:** si `vialidadEstado` indica corte total o restricción fuerte → **condicionado** con `displayLabel` ABIERTO; si no, **abierto**. El **`schedule`** en la vista alimenta solo **`closesInMinutes`** vía `evaluateSchedule` cuando aplica; **no** revierte el estado a cerrado por horario si el oficial sigue en ABIERTO.
- **`inferLegacyHtmlSnapshot`** (horario puro + keywords en alertas) **no se usa** mientras exista `rawStatus` en el snapshot.

## Problemas identificados

- **Inconsistencia `schedule` vs `scheduleRaw` en el snapshot de ejemplo:** `schedule` es `09:00-19:00` (campo `fecha_schema` del API) mientras `scheduleRaw` menciona **0800 a 1900**. La inferencia de horario en UI usa sobre todo el `schedule` parseado para bounds (`mapPassSnapshotToView` / `parseScheduleBounds`), no el texto crudo; puede haber desalineación con el texto oficial largo.
- **Misma limitación de horario + ABIERTO:** como en Cristo Redentor, el estado inferido con API oficial **no pasa a “cerrado fuera de horario”** solo por el reloj.
- **Actualización en CI:** solo tres veces al día salvo refresh manual u otro mecanismo.
- **`htmlAlerts` vacías** en el ejemplo: el HTML no aportó alertas que pasaran el filtro de longitud, o no había bloques detectados por `extractAlertsFromDetailHTML`.

## Variables de entorno necesarias

- **Scraper → JSON local/CI:** ninguna obligatoria.
- **Vercel + persistencia Redis:** `KV_REST_API_URL`, `KV_REST_API_TOKEN` (`.env.example`). Opcional en `.env.local` para pruebas con KV.

## Cómo probar este paso en local

```bash
cd "/Users/fernandomoya/Documents/Paso Chile Hoy"
npx tsx scripts/scrape.ts
```

```bash
node -e "const j=require('./public/snapshots/pehuenche.json'); console.log(j.rawStatus, j.schedule, j.scheduleRaw);"
```

```bash
npm run dev
# Navegar a /pehuenche
```

## Diagnóstico

Pehuenche comparte el mismo pipeline nacional que Cristo Redentor; el estado mostrado viene del **`rawStatus`** y, en caso ABIERTO, de **`vialidadEstado`**. Las discrepancias entre **`fecha_schema`** (`schedule`) y el texto **`horario_atencion`** (`scheduleRaw`) pueden hacer que los rangos horarios en UI no coincidan con el texto largo del organismo. Tampoco el sistema **cierra** el paso por horario cuando Gendarmería marca ABIERTO, lo que puede explicar estados optimistas respecto al reloj. La frescura del archivo en repo depende del **cron espaciado** de Actions, no de un scrape cada pocos minutos.
