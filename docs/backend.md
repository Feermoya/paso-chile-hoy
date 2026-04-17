# Backend — persistencia, capas y límites conocidos

Referencia alineada al **código actual** (`src/lib/server/`, `src/pages/api/`). Para el flujo lectura → UI ver [`flujo-de-datos.md`](./flujo-de-datos.md). Para jobs y CI ver [`scrape.md`](./scrape.md).

**Cristo Redentor — riesgo informativo (v1):** el campo opcional `cristoRisk` se añade en `buildPassRefreshPayload` solo para ese slug. Contrato, reglas y limitaciones: [`cristo-redentor-risk-v1.md`](./cristo-redentor-risk-v1.md).

## Dónde se persiste hoy

| Capa | Ubicación | Rol |
|------|-----------|-----|
| **Archivo canónico (repo + lectura SSR)** | `public/snapshots/{slug}.json` | `PassSnapshot` o `PassRaw` migrable; escrito por `writePassSnapshotFile` / scrapers. |
| **Redis (Upstash)** | Claves `pch:pass-snapshot:v1:{slug}` | En Vercel con `KV_*` configurado: **lectura/escritura prioritaria** sobre el archivo. El JSON del deploy es bootstrap. |
| **Histórico de series** | **No existe** en el código | Solo “último snapshot” por paso (+ `twitter-latest.json`, `rutas/*.json` para home RN7). |

**Nota:** existe un archivo suelto `data/snapshots/cristo-redentor.json` que **no** es leído por `jsonSnapshotStore` (solo `public/snapshots/`). Tratarlo como legado o copia manual; no forma parte del pipeline.

## API routes

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| GET | `/api/snapshot/[slug]` | `getSnapshotForApi` → envelope `PassSnapshotApiEnvelope` (vista + flags + snapshot crudo opcional). |
| POST | `/api/snapshot/[slug]` | Si `verifyRefreshPostAuth`: `refreshAndPersistSnapshot`; si falla y hay JSON previo, 200 stale. |
| POST | `/api/refresh/[slug]` | Igual que POST snapshot pero **exige** éxito del refresh (503 si falla). |
| GET | `/api/data/[slug]` | `fetchConsolidado` + `fetchClima` + `mapToSnapshot` **sin** forecast HTML ni wttr. Uso debug; **no** referenciado por la UI. |
| GET | `/api/cron/twitter-refresh` | Bearer o `?secret=` con `CRON_SECRET`. Tweets RSS. |
| GET/POST | `/api/likes` | Contador de likes en Redis (`pch:likes`). |

Autenticación refresh: `src/lib/server/refreshPostAuth.ts` — si `SCRAPE_SECRET` está definido, hace falta header `x-scrape-secret` **o** petición same-origin; si no hay secreto, POST abierto (solo recomendable en dev).

## Capas de datos (qué se pierde o no)

1. **Ingesta** (`snapshotService`, `cristoRedentorSnapshot`, `pehuencheSnapshot`, `aguaNegraScraper`, `apiClient`, `wttrClient`).
2. **Persistido** `PassSnapshot` (`passMapper.ts`).
3. **VIEW** `mapPassSnapshotToView` / `mapPersistedSnapshotToView` (`passViewMapper.ts`).
4. **Inferencia de badge** `inferPassStatus` — no muta `PassView`; solo deriva `PassStatusResult` para UI.
5. **Heurística de manejo** `assessDrivingConditions` — solo clima en cliente/SSR para componente conducción.

### Campos del snapshot que no llegan a `PassView`

- **`weather.humidity`**: existe en `PassSnapshot.weather` pero **`WeatherNowView` no tiene humedad** → no se muestra en tarjeta de paso (sí en Las Leñas, otro pipeline).
- **`lat` / `lng` en snapshot** si el refresh los ajusta desde consolidado: `mapPassSnapshotToView` usa **`paso.lat` / `paso.lng`** para `gps`, no los del JSON.
- **Agua Negra:** `statusDetail`, `scheduleText`, `scheduleDays`, `restriccionPasajeros`, `restriccionVelocidad` están en `PassSnapshot` pero **no** están mapeados a `PassView.operationalInfo` (parte del contexto queda solo en JSON / `htmlAlerts`).

### Prioridad de fuentes (resumen)

| Situación | Resolución en código |
|-----------|----------------------|
| `rawStatus` presente | **`inferFromOfficialApi`**: manda Gendarmería. `ABIERTO` + `vialidadEstado` con CORTE TOTAL / RESTRINGIDA → badge **condicionado** + `displayLabel: "ABIERTO"`. |
| `rawStatus` ausente | **`inferLegacyHtmlSnapshot`**: alertas con keywords, luego horario. |
| Pronóstico wttr vs HTML (Agua Negra) | Primero wttr; si no hay ítems de forecast, intenta HTML ruta 27. |
| Cristo / Pehuenche | Clima SMN (`fetchClima`); forecast desde **HTML** `parseForecastFromHTML` (no wttr en config actual). |

## Lógica “parecida a riesgo” (existente) + motor Cristo v1

| Módulo | Qué hace |
|--------|----------|
| `inferPassStatus.ts` | Estados discretos, `confidence`, countdown `opensInMinutes` / `closesInMinutes`, regla vialidad vs ABIERTO. |
| `drivingConditions.ts` + `weatherInterpretation.ts` | Niveles `normal` \| `caution` \| `warning` \| `danger` según tª, viento, visibilidad, texto; forecast con keywords (nieve, lluvia, tormenta). **No** es el mismo objeto que el badge del paso. |
| `isVialidadCorteTotal` | Helper para UI que alinea con regla de corte total. |
| **`computeCristoRedentorRiskV1`** (`src/lib/risk/computeCristoRedentorRiskV1.ts`) | Solo **cristo-redentor**: produce `cristoRisk` en el payload; **no** reemplaza `inferPassStatus`. Ver [`cristo-redentor-risk-v1.md`](./cristo-redentor-risk-v1.md). |

No hay persistencia de eventos históricos para el riesgo (etapa futura: [`risk-engine-roadmap.md`](./risk-engine-roadmap.md)).

## Qué no está en el repo

- Tests automatizados de snapshots (`*.test.ts` no presentes en el árbol habitual).
- Cron interno en el proceso Node (la frescura la define el host + GHA + política en `snapshotService`).
