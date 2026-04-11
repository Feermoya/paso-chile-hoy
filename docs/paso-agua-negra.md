# Paso Agua Negra — Documentación de flujo de datos

## Estado actual del snapshot

```json
{
  "slug": "agua-negra",
  "name": "Paso Agua Negra",
  "schedule": "09:00-17:00",
  "scheduleRaw": "09:00 a 17:00 hs",
  "rawStatus": "CERRADO",
  "statusDetail": "Cerrado para egreso",
  "scheduleText": "09:00 a 17:00 hs",
  "scheduleDays": "Todos los días de la semana, incluidos feriados.",
  "motivo": null,
  "motivoInfo": null,
  "htmlAlerts": [
    "Cerrado para egreso",
    "Días de apertura: Todos los días de la semana, incluidos feriados.",
    "Vehículos hasta 22 butacas",
    "Velocidad moderada"
  ],
  "vialidadRuta": "150",
  "vialidadTramo": "",
  "vialidadEstado": "HABILITADA",
  "vialidadObservaciones": "",
  "restriccionPasajeros": "Vehículos hasta 22 butacas",
  "restriccionVelocidad": "moderada",
  "latestTweet": null,
  "weather": {
    "temperatureC": 12,
    "description": "Soleado",
    "wind": "SE a 4 km/h",
    "visibilityKm": 10,
    "sunrise": "07:54",
    "sunset": "19:22",
    "updatedAt": "2026-04-11T13:48:54.139Z",
    "feelsLikeC": 12,
    "humidity": 51
  },
  "contact": null,
  "lat": -30.32783,
  "lng": -69.23614,
  "altitudeM": 4765,
  "scrapedAt": "2026-04-11T13:48:54.140Z",
  "forecast": [
    {
      "period": "Hoy al mediodía",
      "description": "Soleado",
      "temperatureC": 15,
      "wind": "ESE 6 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Hoy por la tarde",
      "description": "Soleado",
      "temperatureC": 19,
      "wind": "E 9 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Hoy por la tarde",
      "description": "Soleado",
      "temperatureC": 21,
      "wind": "ENE 9 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Hoy por la noche",
      "description": "Despejado",
      "temperatureC": 15,
      "wind": "N 3 km/h",
      "visibility": "Buena"
    }
  ],
  "sources": {
    "status": "aguanegra.sanjuan.gob.ar",
    "clima": "wttr.in",
    "statusUpdatedAt": "11 de abril de 2026 • 09:31 hs"
  }
}
```

*(Contenido tomado de `public/snapshots/agua-negra.json` en el repo.)*

## Fuentes de datos

### Fuente 1: Sitio oficial San Juan (HTML)

- **URL:** `https://aguanegra.sanjuan.gob.ar/estado-del-paso`
- **Tipo:** HTML scraping (regex sobre el documento)
- **Se llama en:** `scrapeAguaNegraStatus()` en `src/lib/server/aguaNegraScraper.ts` (aprox. líneas 22–167), invocada desde `refreshAguaNegraFromSanJuan` en `src/lib/server/services/snapshotService.ts` (aprox. líneas 52–55) cuando `slug === "agua-negra"`.
- **Qué campos usa:** estado (`rawStatus`, `statusDetail`) por orden de regex; fecha/hora legible en `statusUpdatedAt`; horario `scheduleNormalized` / texto; días; RN y bloques de vialidad (“Habilitada”, “Cortada”, etc.); restricciones de pasajeros y velocidad. Comentario en código: **no** hay API nacional ni SMN para este flujo (`snapshotService.ts` aprox. línea 52).
- **Con qué frecuencia:** cada vez que corre el scraper (mismos tres crons diarios de Actions + manual).
- **Funciona en local:** sí (HTTP público). Si el sitio cambia el HTML, los regex pueden dejar de coincidir y caer en `SIN_DATOS` o en un estado incorrecto.

### Fuente 2: wttr.in (clima)

- **URL:** cliente en `src/lib/server/wttrClient.ts` (sin API key; ver comentario en archivo).
- **Tipo:** endpoint(s) usados por el cliente wttr (JSON agregado por el código del proyecto).
- **Se llama en:** `fetchWttrClimaForPaso` desde `refreshAguaNegraFromSanJuan` con `wttrQuery: "Las+Flores,San+Juan,Argentina"` definido en `src/data/pasos.ts` (`climaSource: "wttr"`).
- **Qué campos usa:** temperatura, sensación, humedad, viento, visibilidad, pronóstico, horas de sol; `weather.updatedAt` se rellena con `temp?.date` del paquete wttr (no con la fecha del HTML de San Juan).
- **Con qué frecuencia:** cada refresh del snapshot de Agua Negra.
- **Funciona en local:** sí, si wttr.in responde; si falla, el código registra advertencia y el clima puede quedar parcial o vacío según la rama (en Agua Negra no hay fallback SMN en el bloque actual de `refreshAguaNegraFromSanJuan`).

### Fuentes que no se usan para este paso

- **`fetchConsolidado` / `fetchDetailHTML` de Argentina.gob.ar:** para `agua-negra`, `refreshAndPersistSnapshot` **sale antes** y llama solo a San Juan + wttr. Esas URLs nacionales **no** se consultan en el scrape de este slug (líneas 151–153 de `snapshotService.ts`).

## Flujo completo paso a paso

1. GitHub Actions ejecuta `npx tsx scripts/scrape.ts` con los crons UTC: **`17 10 * * *`**, **`23 15 * * *`**, **`41 21 * * *`** (ver `.github/workflows/scrape.yml`).
2. Para `agua-negra`, **`refreshAndPersistSnapshot`** delega en **`refreshAguaNegraFromSanJuan`**: `scrapeAguaNegraStatus()` + `fetchWttrClimaForPaso(...)`.
3. Se arma un **`PassSnapshot`** manualmente en `snapshotService.ts` (no pasa por **`mapToSnapshot`** del consolidado nacional).
4. Se persiste con **`writePassSnapshot("agua-negra", snapshot)`** → `public/snapshots/agua-negra.json` (más Redis en Vercel si aplica).
5. En **`/agua-negra`**, `getSnapshotForApi` → **`mapPassSnapshotToView`** (el snapshot cumple `isPassSnapshotShape`) → **`inferPassStatus`**.

## Cómo se determina el estado (ABIERTO/CERRADO/CONDICIONADO)

- El snapshot siempre incluye un string **`rawStatus`** (`ABIERTO`, `CERRADO`, `CONDICIONADO` o **`SIN_DATOS`** si el scrape no matcheó).
- Mientras **`rawStatus`** sea no vacío, **`inferPassStatus`** usa **`inferFromOfficialApi`** igual que los pasos nacionales (`src/utils/inferPassStatus.ts`).
- Por tanto:
  - **`CERRADO` / `CONDICIONADO`:** resultado directo (como en el JSON de ejemplo: CERRADO).
  - **`ABIERTO`:** además se mira **`vialidadEstado`** del snapshot: si fuera CORTE TOTAL o RESTRINGIDA, pasaría a condicionado con etiqueta ABIERTO. En el ejemplo del repo, **`rawStatus` es CERRADO** pero **`vialidadEstado` es HABILITADA** — coherente con “cerrado para egreso” a nivel operativo mientras la ruta figure habilitada; la inferencia sigue **cerrado** por prioridad de `rawStatus`.
- **El `schedule` no anula un CERRADO/CONDICIONADO explícito** en `inferFromOfficialApi`. Para **ABIERTO**, el horario solo aporta **`closesInMinutes`** en los mismos términos que los otros pasos; **no** fuerza “cerrado por horario” sobre un ABIERTO textual del HTML scrapeado.
- Si el HTML no matcheara ningún patrón y quedara **`SIN_DATOS`**, `inferFromOfficialApi` caería en el caso “estado no reconocido” → **`sin_datos`** con baja confianza; **no** se ejecuta automáticamente `inferLegacyHtmlSnapshot` porque `rawStatus` seguiría siendo el string `"SIN_DATOS"` (truthy). Las **`htmlAlerts`** no sustituyen esa rama por sí solas.

## Problemas identificados

- **Fragilidad del scraper HTML:** el estado depende de **regex** sobre el HTML (`aguanegraScraper.ts`). Un cambio de maquetado del sitio puede producir **`SIN_DATOS`** o un estado erróneo sin que falle la petición HTTP.
- **Orden de regex:** el primer match gana; si el HTML contiene varias frases conflictivas, el resultado puede no reflejar el mensaje principal visible.
- **Filtro de alertas:** líneas en `htmlAlerts` con longitud ≤ 8 se descartan en `refreshAguaNegraFromSanJuan` (misma política que en el mapper nacional).
- **Comparación de fechas:** `sources.statusUpdatedAt` (ej. “11 de abril de 2026 • 09:31 hs”) es la referencia de actualización del **sitio de San Juan**; conviene contrastarla con la hora actual al auditar datos viejos. `scrapedAt` es cuándo corrió el scraper del proyecto.
- **Sin fallback a API nacional:** si San Juan falla, **no** hay segundo origen de estado en código para Agua Negra.

## Variables de entorno necesarias

- **Scraper local / Actions:** ninguna para San Juan ni wttr (públicos).
- **Vercel + Redis:** mismas `KV_*` que el resto de pasos si se persiste snapshot en runtime (`.env.example`).
- **No** hay variables específicas documentadas para wttr en `.env.example`.

## Cómo probar este paso en local

```bash
cd "/Users/fernandomoya/Documents/Paso Chile Hoy"
npx tsx scripts/scrape.ts
```

Inspeccionar solo Agua Negra (el script procesa todos los slugs; para una prueba rápida se puede ejecutar el scraper completo o invocar en un REPL el servicio, pero el flujo estándar documentado es el script completo):

```bash
node -e "const j=require('./public/snapshots/agua-negra.json'); console.log(j.rawStatus, j.sources);"
```

```bash
npm run dev
# /agua-negra
```

## Diagnóstico

Agua Negra **no** usa el consolidado de Argentina.gob.ar: todo el estado operativo sale del **HTML de San Juan** interpretado por regex, más un **`rawStatus`** que entra por la misma rama de inferencia “oficial” que los otros pasos. Si el HTML cambia o el orden de patrones elige mal, el estado puede ser **`SIN_DATOS`** o incorrecto sin errores de red. Además, **`vialidadEstado` “HABILITADA”** junto a **`CERRADO`** en el snapshot puede confundir en UI si se muestran ambos sin contexto, aunque **`inferPassStatus`** respete el **CERRADO** por `rawStatus`. La actualización del JSON en repo sigue atada al **cron diario** de Actions salvo ejecución manual.
