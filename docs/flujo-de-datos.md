# Flujo de datos — lectura, snapshots e inferencia de estado

Documento vivo para entender **de dónde salen los datos** en Paso Chile Hoy y cómo mejorar el flujo sin duplicar lógica.

## Vista rápida (orden real)

```
Fuente oficial (API + HTML detalle)
        ↓
scripts/scrape.ts  →  refreshAndPersistSnapshot (CI / local)
        ↓
public/snapshots/{slug}.json   (PassSnapshot — JSON versionado en git)
        ↓
getSnapshotForApi(slug)        (lee disco; en Vercel puede hacer live scrape si falta o está muy viejo)
        ↓
mapPersistedSnapshotToView(raw, pasoConfig)  →  PassView
        ↓
inferPassStatus(view)          →  badge: abierto | condicionado | cerrado | sin_datos
        ↓
Páginas / ticker / cards / API interna
```

## 1. Fuentes externas

| Fuente | Uso | Código |
|--------|-----|--------|
| **Consolidado** (JSON) | `estado.estado` (ABIERTO/CERRADO/…), demoras, motivos, `fecha_schema`, vialidad | `fetchConsolidado` en `src/lib/server/apiClient.ts` |
| **Clima** (JSON) | Temperatura, viento, visibilidad, SMN | `fetchClima` |
| **HTML detalle** | Pronóstico 24 h parseado del HTML del paso | `fetchDetailHTML` + `parseForecastFromHTML` |
| **Twitter** (opcional) | Último tweet complementario | `getLatestPassTweet` en scrape |

El **mapper** que arma el snapshot persistido es `mapToSnapshot` en `src/lib/server/passMapper.ts` (`rawStatus` viene de `consolidado.detalle.estado.estado`).

## 2. Snapshot en disco

- **Ruta:** `public/snapshots/{slug}.json`
- **Forma esperada:** `PassSnapshot` (`isPassSnapshotShape` en `passMapper.ts`): exige entre otros `slug`, `rawStatus`, `scrapedAt`, `weather`, `vialidadEstado`.
- **Actualización:** GitHub Actions (`.github/workflows/scrape.yml`) y/o `npm run scrape` en local.
- **Lectura en runtime:** `readPassSnapshotFile` → `getSnapshotForApi` en `src/lib/server/services/snapshotService.ts`.

### Frescura y fallback

- `checkSnapshotFreshness` (`snapshotFreshnessCheck.ts`) loguea advertencias si el JSON tiene horas de antigüedad.
- En **Vercel**, si el snapshot tiene **más de ~120 minutos** (`SNAPSHOT_STALE_MAX_MINUTES`), se intenta `refreshAndPersistSnapshot` (API en vivo). Si falla la red, se sirve el JSON viejo.

## 3. De JSON a `PassView`

- Entrada: `mapPersistedSnapshotToView(raw, paso)` en `src/lib/mappers/passViewMapper.ts`.
- Si `raw` cumple `PassSnapshot` → `mapPassSnapshotToView` (incluye **`operationalInfo.rawStatus`**).
- Si es formato **legado** `PassRaw` sin campos de API → `mapPassRawToView` (**no** rellena `rawStatus`).

## 4. Inferencia del badge (crítico)

Archivo: `src/utils/inferPassStatus.ts`.

### 4.1 Cuando existe `operationalInfo.rawStatus` (flujo actual con API)

`inferPassStatus` llama a **`inferFromOfficialApi`**:

- `CERRADO` → badge **cerrado**
- `CONDICIONADO` → **condicionado**
- `ABIERTO` → **abierto** (o **condicionado** con `displayLabel: "ABIERTO"` si la vialidad es corte/restricción; no usa el horario para forzar “cerrado”)
- Cualquier otro texto → `sin_datos`

**Importante:** con `rawStatus === "ABIERTO"`, **no** se aplica la regla de “cerrado por estar fuera del horario” en esta rama. El estado de Gendarmería manda sobre el horario para el badge.

### 4.2 Cuando **no** hay `rawStatus` (legado / JSON incompleto)

Se usa **`inferLegacyHtmlSnapshot`**:

- Puede inferir **cerrado** por palabras en alertas, o por **horario** (`evaluateSchedule`): si el horario es tipo `09:00–19:00` y la hora actual (Argentina) está **fuera** de la ventana, el resultado puede ser **cerrado** (“Fuera del horario operativo”) aunque en otro sistema se considere el paso “abierto” en sentido operativo.

Esto explica discrepancias históricas: **sin `rawStatus` en el VIEW**, la UI no refleja el consolidado `estado.estado`.

## 5.1 Bloque “Datos del paso” (una sola vez en DOM)

- Componente: `PassDetails.astro` + `PassDetailsInner.astro`.
- **Un solo** `PassDetailsInner` por página: el panel responsive usa `<details>` con script (`pass-details-panel.client.ts`) para abrir en `md+` y colapsar en móvil, en lugar de duplicar el mismo HTML en desktop.
- El **horario** en el hero (`StatusHero`) no se repite en `PassDetailsInner` cuando `hideScheduleInDetails` es true (`passDetailsHasContent` puede ignorar el horario al decidir si hay contenido).

## 5. Dónde se consume el flujo

| Destino | Archivo | Notas |
|---------|---------|--------|
| Página del paso | `src/pages/[slug].astro` | `getSnapshotForApi` → `mapPersistedSnapshotToView` → `inferPassStatus` |
| Home (cards) | `src/pages/index.astro` | Misma cadena por cada paso activo |
| Ticker | `src/components/AlertTicker.astro` | Lee snapshots en build SSR del request |
| API JSON para cliente | `src/pages/api/snapshot/[slug].ts` | Refresh en cliente / scripts |
| Debug | `DEBUG_PASS=true` + logs en `[slug].astro` | Ver `rawStatus`, `vialidadEstado`, status inferido |

## 6. Clima en pantalla vs consolidado

El bloque **clima detallado** (temperatura, “Parcialmente nublado”, visibilidad km) viene del **mismo snapshot** (`weather` en JSON), alimentado por `fetchClima` en el scrape. Puede coincidir con el JSON de clima que pegues del endpoint porque es la misma cadena de ingestión.

El **badge rojo/verde** no se calcula desde el JSON de clima solo: viene de **`inferPassStatus`** y del campo **`rawStatus`** (y en legado, de horario/alertas).

## 7. Metadatos SSR (head) — OG, Twitter, favicon

- **Tipo** `LayoutSeoBundle` y builders en `src/utils/seo.ts`: `buildHomeMeta`, `buildPassPageMeta`, `buildLegalPageMeta`, `buildNotFoundMeta`, `buildServerErrorMeta`.
- Las páginas pasan `{...seo}` a `MainLayout` (sin duplicar tags a mano). El `<head>` se renderiza en el servidor.
- Incluye: `title`, `description`, `canonical`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width/height/alt`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.
- **Imagen OG**: `DEFAULT_OG_IMAGE` (`/og-image.png` absoluta) hasta tener OG dinámica.
- **Favicon / apple-touch-icon**: constantes `SITE_FAVICON` en `seo.ts`, usadas solo en `MainLayout`.
- **`<title>`** en paso: estable por URL; **descripción** estable; **OG** del paso puede incluir estado/clima para previews en WhatsApp, Telegram, X, etc.

## 7.1 SEO en páginas de paso (contenido)

- `buildPassPageMeta` en `src/utils/seo.ts`.
- **`<title>`**: `{Nombre del paso} | {SITE_NAME}` — estable para la misma URL (el estado visible está en el hero).
- **`<meta name="description">`**: única por paso, texto estable (sin “ABIERTO/CERRADO” que cambie cada request).
- **Open Graph** (`og:title`, `og:description`): pueden incluir estado, horario y clima para mejor CTR al compartir.

## 9. Checklist si “la API dice ABIERTO pero la UI dice Cerrado”

1. Confirmar que estás mirando **esta** app (`pasochilehoy.com` / tu deploy), no el **mapa del sitio oficial** argentina.gob.ar (otro front distinto).
2. Abrir `public/snapshots/agua-negra.json` y verificar **`rawStatus`** y **`scrapedAt`**.
3. Con `DEBUG_PASS=true`, revisar en consola del servidor la línea `rawStatus (del JSON)` y `Status inferido`.
4. Si `rawStatus` es `"ABIERTO"` y aun así el badge es cerrado, buscar **caché** (CDN, navegador) o un **deploy viejo**.
5. Si `rawStatus` **falta** en el JSON o el archivo no es `PassSnapshot`, revisar la rama **legacy** (horario fuera de ventana).

---

Ver también: `docs/endpoints-internos.md`, `docs/data-model.md` (modelo RAW/VIEW; algunas secciones pueden preceder al pipeline API — contrastar con este documento).
