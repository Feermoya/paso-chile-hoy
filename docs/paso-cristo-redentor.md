# Paso Cristo Redentor — Documentación de flujo de datos

## Estado actual del snapshot

```json
{
  "slug": "cristo-redentor",
  "name": "Sistema Cristo Redentor",
  "schedule": "09:00-21:00",
  "scheduleRaw": "HABILITADO DE LAS 0900 HS A 2100 HS",
  "rawStatus": "ABIERTO",
  "motivo": null,
  "motivoInfo": null,
  "htmlAlerts": [
    "Vialidad Nacional informa: Corte total RN 7 tramo Tunel Internacional Corte preventivo por nevadas Contacto: (2624) 420094"
  ],
  "vialidadRuta": "7",
  "vialidadTramo": "Tunel Internacional",
  "vialidadEstado": "CORTE TOTAL",
  "vialidadObservaciones": "Corte preventivo por nevadas",
  "latestTweet": null,
  "weather": {
    "temperatureC": 5.3,
    "description": "Ligeramente nublado",
    "wind": "Calma",
    "visibilityKm": 15,
    "sunrise": "07:57",
    "sunset": "19:23",
    "updatedAt": "2026-04-11T09:00:00-03:00"
  },
  "contact": "(2624) 420094",
  "lat": -32.8211,
  "lng": -69.9232,
  "altitudeM": 3200,
  "scrapedAt": "2026-04-11T13:48:51.255Z",
  "forecast": [
    {
      "period": "Hoy por la tarde",
      "description": "Parcialmente nublado",
      "temperatureC": 5,
      "wind": "O a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Hoy por la noche",
      "description": "Algo nublado",
      "temperatureC": -5,
      "wind": "NO a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Mañana por la madrugada",
      "description": "Despejado",
      "temperatureC": -4,
      "wind": "NO a 23-31 km/h",
      "visibility": "Buena"
    },
    {
      "period": "Mañana por la mañana",
      "description": "Mayormente nublado",
      "temperatureC": 1,
      "wind": "O a 13-22 km/h",
      "visibility": "Buena"
    }
  ]
}
```

*(Contenido tomado de `public/snapshots/cristo-redentor.json` en el repo; las fechas reflejan el último commit del archivo, no la fecha “hoy” del lector.)*

## Fuentes de datos

### Fuente 1: API consolidado Argentina.gob.ar (Gendarmería / estado del paso)

- **URL:** `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle_consolidado/ruta/29`
- **Tipo:** endpoint JSON
- **Se llama en:** `src/lib/server/apiClient.ts` (`fetchConsolidado`, aprox. líneas 108–109), invocado desde `src/lib/server/services/snapshotService.ts` en `refreshAndPersistSnapshot` (aprox. líneas 155–157) cuando el slug no es `agua-negra`.
- **Qué campos usa:** el mapper `mapToSnapshot` en `src/lib/server/passMapper.ts` lee `consolidado.detalle` (nombre, `estado.estado` → `rawStatus`, motivos, `fecha_schema` → `schedule`, horario de atención → `scheduleRaw`, contacto) y `consolidado.vialidad` (ruta, tramo, estado, observaciones).
- **Con qué frecuencia:** el workflow de GitHub Actions ejecuta el scraper **tres veces al día** (no cada X minutos): `cron: "17 10 * * *"`, `cron: "23 15 * * *"`, `cron: "41 21 * * *` (UTC). Entre ejecuciones, el sitio en producción puede leer solo el JSON desplegado / Redis según configuración.
- **Funciona en local:** sí, son peticiones `fetch` públicas sin API key (con reintentos y User-Agent en `apiClient.ts`).

### Fuente 2: HTML de detalle Argentina.gob.ar (pronóstico y alertas)

- **URL:** `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor` (derivada de `routeId` + `routeSlug` en `src/data/pasos.ts`).
- **Tipo:** HTML scraping (texto parseado)
- **Se llama en:** `fetchDetailHTML` en `src/lib/server/apiClient.ts` (aprox. líneas 118–120); el HTML se procesa con `parseForecastFromHTML` y `extractAlertsFromDetailHTML` en `snapshotService.ts` (aprox. líneas 160–161).
- **Qué campos usa:** bloque `forecast` del snapshot y array `htmlAlerts` (strings filtrados con longitud > 8 caracteres en `mapToSnapshot` / opciones del mapper).
- **Con qué frecuencia:** misma corrida que la fuente 1 (mismo `refreshAndPersistSnapshot`).
- **Funciona en local:** sí, igual que la API.

### Fuente 3: API clima SMN (Argentina.gob.ar)

- **URL:** `https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle_clima/{lat}/{lng}` con las coordenadas del paso (`-32.8211`, `-69.9232`).
- **Tipo:** endpoint JSON
- **Se llama en:** `fetchClima` en `src/lib/server/apiClient.ts` (aprox. líneas 112–115); para Cristo Redentor **no** se usa wttr: rama `else` en `snapshotService.ts` (aprox. líneas 181–182) porque `climaSource` no está definido como `"wttr"` en `pasos.ts`.
- **Qué campos usa:** temperatura, viento, visibilidad, descripción, `temp.date` → `weather.updatedAt`, salida/puesta de sol vía `extractTimeFromIso`.
- **Con qué frecuencia:** cada refresh del snapshot.
- **Funciona en local:** sí.

### Fuente que no aplica

- **San Juan / Agua Negra:** el scraper HTML de `aguaNegraScraper.ts` **no** se usa para Cristo Redentor.

## Flujo completo paso a paso

1. **GitHub Actions** corre `npx tsx scripts/scrape.ts` (job “Ejecutar scraper” en `.github/workflows/scrape.yml`) en el horario de los tres `cron` UTC indicados arriba, y también por `workflow_dispatch`.
2. **`scripts/scrape.ts`** obtiene los slugs con `listPassSlugs()` desde `src/lib/server/config/passes.ts` (pasos activos de `src/data/pasos.ts`) y, para cada slug, llama a `refreshAndPersistSnapshot(slug)` desde `src/lib/server/services/snapshotService.ts`, con una pausa de 2 s entre pasos.
3. Para **cristo-redentor**, `refreshAndPersistSnapshot` ejecuta en paralelo `fetchConsolidado(29)` y `fetchDetailHTML(29, "Sistema-Cristo-Redentor")`, luego `parseForecastFromHTML`, `extractAlertsFromDetailHTML`, `fetchClima(lat, lng)` y **`mapToSnapshot`** (`src/lib/server/passMapper.ts`).
4. **`writePassSnapshot`** (`src/lib/server/storage/passSnapshotStorage.ts`) persiste: en entorno sin `VERCEL`, escribe `public/snapshots/cristo-redentor.json` vía `jsonSnapshotStore`; si hay Redis (Upstash) configurado, también actualiza la clave KV.
5. Cuando un usuario abre **`/cristo-redentor`**, la página (`src/pages/[slug].astro`, `prerender = false`) llama a **`getSnapshotForApi(slug)`**, que en producción/Vercel prioriza leer snapshot persistido (Redis si existe, si no archivo del deploy). El raw se convierte con **`mapPersistedSnapshotToView`** → **`mapPassSnapshotToView`** (`passViewMapper.ts` / `passMapper.ts`) y luego **`buildPassRefreshPayload`** ejecuta **`inferPassStatus(view)`** (`src/lib/server/passRefreshPayload.ts`).

## Cómo se determina el estado (ABIERTO/CERRADO/CONDICIONADO)

- **`inferPassStatus`** (`src/utils/inferPassStatus.ts`, aprox. líneas 464–469): si `view.operationalInfo.rawStatus` tiene texto, entra en **`inferFromOfficialApi`** y **no** usa la rama legacy basada solo en horario/alertas del HTML antiguo.
- **Prioridad absoluta del `rawStatus` oficial** para CERRADO y CONDICIONADO: si `rawStatus` (normalizado) es `CERRADO` o `CONDICIONADO`, el resultado es cerrado o condicionado con confianza alta, usando `motivo` si existe.
- Si **`rawStatus === "ABIERTO"`**:
  - Se evalúa **`vialidadEstado`**: si coincide con corte total o restricción fuerte, el estado mostrado pasa a **condicionado** con **`displayLabel: "ABIERTO"`** (líneas aprox. 332–357). En el snapshot de ejemplo, Gendarmería dice ABIERTO pero vialidad dice CORTE TOTAL → la UI trata eso como condicionado por alerta de vialidad.
  - El **`schedule`** (vía `scheduleForInference`, derivado del snapshot en la vista) se usa **solo** para calcular **`closesInMinutes`** cuando `evaluateSchedule` devuelve estado abierto o condicionado; **no** se fuerza “cerrado por horario” si el oficial sigue en ABIERTO. Es decir: **un ABIERTO fuera de ventana horaria sigue siendo inferido como abierto** a nivel de estado principal; el horario solo aporta el contador de cierre cuando aplica dentro de la ventana interpretada.
- **`htmlAlerts`** no son el input principal de `inferFromOfficialApi`; la inferencia oficial gira en `rawStatus`, `motivo` y `vialidadEstado` para el caso ABIERTO.

## Problemas identificados

- **Horario vs estado oficial:** con `rawStatus` presente, **no** se aplica la lógica de `evaluateSchedule` para cambiar el badge a “cerrado fuera de horario”; solo afecta `closesInMinutes` en algunos casos de ABIERTO. Puede haber discrepancia con la realidad operativa si el paso cierra por horario pero el JSON sigue en ABIERTO.
- **Tres actualizaciones diarias en CI:** la documentación en `snapshotPolicy.ts` sugiere ventanas de 10 min para refresh en vivo; el cron de Actions **no** es cada 10 minutos, sino 3 veces al día (salvo que se dispare el workflow a mano o otro proceso actualice snapshots).
- **Filtro de alertas:** fragmentos de texto con 8 caracteres o menos se descartan al armar `htmlAlerts` (`passMapper.ts` / `snapshotService.ts`), lo que podría ocultar mensajes cortos relevantes.
- **Campo `weather.updatedAt`:** refiere al paquete de clima SMN, **no** a un “último update de Gendarmería” con otro nombre; no hay en el snapshot un campo `gendarmeriaUpdatedAt` separado para este paso.

## Variables de entorno necesarias

- **Para ejecutar solo el scraper y escribir JSON en disco (local / Actions):** ninguna obligatoria; `fetch` a endpoints públicos.
- **Para runtime en Vercel con persistencia en Redis:** `KV_REST_API_URL` y `KV_REST_API_TOKEN` (ver `.env.example`). Sin ellas en Vercel, `writePassSnapshot` puede fallar al intentar persistir tras un refresh en vivo.
- **`.env.local`:** opcional para KV si querés probar Redis en local; el scraper standalone no lo requiere.

## Cómo probar este paso en local

```bash
cd "/Users/fernandomoya/Documents/Paso Chile Hoy"
npx tsx scripts/scrape.ts
# o: npm run scrape
```

Verificar salida de consola para `cristo-redentor` y el archivo:

```bash
node -e "const j=require('./public/snapshots/cristo-redentor.json'); console.log(j.rawStatus, j.scrapedAt);"
```

Para la página SSR en desarrollo:

```bash
npm run dev
# Abrir http://localhost:4321/cristo-redentor (puerto según Astro)
```

Opcional: `DEBUG_PASS=true` para logs de pipeline en consola del servidor (`[slug].astro`).

## Diagnóstico

El estado de badge depende casi por completo del **`rawStatus`** del JSON nacional y, si está ABIERTO, de si **`vialidadEstado`** dispara la rama de “alerta de vialidad” (condicionado con etiqueta ABIERTO). El **horario del snapshot no puede cerrar el paso** en la inferencia cuando hay `rawStatus` oficial, lo que explica posibles estados “abiertos” aunque sea de noche respecto al `schedule`. Además, los datos del repo solo se renuevan en CI unas **tres veces al día**, así que en horas intermedias el JSON puede quedar desactualizado respecto al sitio oficial aunque el scrape local funcione.
