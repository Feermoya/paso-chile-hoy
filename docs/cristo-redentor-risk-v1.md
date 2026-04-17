# Cristo Redentor Risk Engine v1 — especificación técnica

**Alcance:** solo el paso con slug `cristo-redentor`. No aplica a Pehuenche ni Agua Negra.

**Roadmap de evolución:** [`risk-engine-roadmap.md`](./risk-engine-roadmap.md).

---

## 1. Qué es `cristoRisk`

`cristoRisk` es un objeto opcional de tipo **`CristoRedentorRiskV1`** que viaja en el payload unificado del paso cuando `paso.slug === "cristo-redentor"`.

- Se calcula en **servidor** (SSR y rutas API que usan `buildPassRefreshPayload`).
- Es una capa **informativa de “complicaciones / prudencia”** derivada de datos ya normalizados (`PassView`, estado inferido, heurística de manejo y pronóstico).
- **No** es predicción de cierre futuro ni sustituto del parte oficial.

Definición TypeScript: `src/types/cristo-redentor-risk-v1.ts`.

---

## 2. Qué NO reemplaza

| No sustituye | Motivo |
|--------------|--------|
| **`inferPassStatus` / badge oficial** | El badge sigue siendo la única fuente de “abierto / condicionado / cerrado / sin_datos” para la UI principal. |
| **Datos de Gendarmería o Vialidad en crudo** | `cristoRisk` solo **interpreta** lo ya presente en `PassView` y en `PassStatusResult`. |
| **Componente `DrivingConditions`** | Usa la misma función `assessDrivingConditions` con los mismos insumos que el bloque de conducción; no duplica reglas distintas de clima. |

Si el usuario ve tensión entre “badge ABIERTO” y “riesgo alto de complicaciones”, puede ser **coherente**: el paso puede estar abierto y aun así el clima o la ruta ser adversos (véase sección de consistencia).

---

## 3. Dónde se calcula

| Paso en código | Archivo / función |
|----------------|-------------------|
| Construcción del payload | `buildPassRefreshPayload` en `src/lib/server/passRefreshPayload.ts` |
| Motor de reglas | `computeCristoRedentorRiskV1` en `src/lib/risk/computeCristoRedentorRiskV1.ts` |
| Condiciones de manejo | `assessDrivingConditions` + `weatherNowToDrivingInput` en `src/utils/drivingConditions.ts` |
| Clasificación de forecast por keywords | `forecastAdverseTier` en `src/utils/forecastAdverseSignals.ts` (alineado al ramal de pronóstico de `drivingConditions.ts`) |
| Gating por slug | Solo si `paso.slug === "cristo-redentor"` se asigna `cristoRisk`; otros pasos **no** incluyen la clave en el objeto retornado |

Orden dentro de `buildPassRefreshPayload` (simplificado):

1. `mapPersistedSnapshotToView(raw, paso)` → `PassView`
2. Overrides opcionales de Cristo (horario manual)
3. `statusResult = inferPassStatus(view)` — **sin modificar** el motor de inferencia
4. `drivingForRisk = assessDrivingConditions(now ? weatherNowToDrivingInput(now) : vacío, forecast)`
5. `computeCristoRedentorRiskV1({ view, statusResult, driving: drivingForRisk, hasUsableNow })` — solo slug Cristo
6. Retorno del payload con `cristoRisk` esparcido solo si se calculó

El envelope `PassSnapshotApiEnvelope` (GET/POST `/api/snapshot/[slug]`) **extiende** `PassPageRefreshPayload` y por tanto **hereda** `cristoRisk` sin cambiar el contrato base de los otros campos.

---

## 4. Inputs del motor

| Input | Origen |
|--------|--------|
| `view` | `PassView` ya mapeado (clima, forecast, vialidad, meta) |
| `statusResult` | Resultado de `inferPassStatus(view)` (badge lógico) |
| `driving` | Una evaluación `DrivingAssessment` de `assessDrivingConditions` con el mismo `forecast` que el payload; si no hay “ahora” utilizable, se usa clima vacío para la parte “actual” y el pronóstico sigue aplicando |
| `hasUsableNow` | `true` solo si `weatherNowHasDisplayableContent(now)` (`src/utils/passViewGuards.ts`) — afecta principalmente a `confidence` |

El motor **lee** `view.operationalInfo.vialidadEstado` y usa `isVialidadCorteTotal` de `src/utils/inferPassStatus.ts` (solo el **estado** textual de vialidad, no observaciones largas).

---

## 5. Output (`CristoRedentorRiskV1`)

Campos principales:

| Campo | Rol |
|-------|-----|
| `schemaVersion` | Fijado en `1`; subir solo con cambios incompatibles de contrato |
| `slug` | Siempre `"cristo-redentor"` |
| `computedAt` | ISO 8601 del cálculo |
| `level` | Uno de los cuatro niveles (ver §6) |
| `headline` / `summary` | Texto fijo por nivel (prudente, no marketing) en `computeCristoRedentorRiskV1.ts` |
| `reasons[]` | Códigos estables (`code`) para auditoría y futura i18n |
| `confidence` | `high` \| `medium` \| `low` — refleja calidad de datos, no “probabilidad bayesiana” |
| `audit` | Snaphot mínimo: `badgeStatus`, `displayLabel`, `drivingLevel`, `forecastTier`, `vialidadEstado`, `operationalStale` |

---

## 6. Niveles y significado

| `level` | Interpretación de producto |
|---------|----------------------------|
| `low` | Sin señales fuertes de complicación meteorológica o de manejo con los datos actuales. |
| `moderate` | Señales moderadas (viento/visibilidad/temperatura/pronóstico adverso leve) o **falta de estado oficial** (`sin_datos`) con prudencia. |
| `high_complications` | Clima/manjeo adversos fuertes (p. ej. `danger` en driving o nieve en pronóstico según tier). **Puede** darse con badge **ABIERTO**: no implica cierre predicho. |
| `possible_preventive_closure` | Estado oficial **cerrado** o **condicionado**, o **corte total** en `vialidadEstado` según `isVialidadCorteTotal`. El nombre refiere a riesgo operativo / restricción; **no** predice horarios. |

---

## 7. Reglas de decisión (orden)

Implementación literal en `computeCristoRedentorRiskV1.ts`:

1. **Preventivo (máxima prioridad):** si `cerrado` **o** `condicionado` **o** `isVialidadCorteTotal(vialidadEstado)` → `possible_preventive_closure`.
2. **Alto:** si no preventivo y (`driving.level === "danger"` **o** `forecastAdverseTier === "snow"`) → `high_complications`.
3. **Moderado:** si no preventivo ni alto y (`warning` \| `caution` \| tier `storm` \| tier `rain`) → `moderate`.
4. **Sin datos oficiales:** si `sin_datos` y no entró antes → `moderate` (con razón `official_data_incomplete`).
5. **Bajo:** resto (p. ej. abierto + condiciones favorables).
6. **Tope:** si `sin_datos` y el nivel hubiera quedado en `high_complications`, se **fuerza** a `moderate` y se agrega `capped_no_official_status`.

**`confidence`:**

- `low` si `sin_datos` o `view.meta.operationalStale === true`
- `high` si `hasUsableNow`
- `medium` en los demás casos con datos oficiales

---

## 8. Relación con otros módulos

| Módulo | Relación |
|--------|----------|
| **`inferPassStatus`** | Solo entrada; el motor **no** invoca ni altera esta función. |
| **`drivingConditions`** | Misma función `assessDrivingConditions` que la UI de conducción; puede haber **dos llamadas** por request SSR (payload + componente), mismos insumos esperados. |
| **Forecast** | `forecastAdverseTier` comparte criterios con el ramal de pronóstico en `drivingConditions.ts`. |
| **Vialidad** | Solo `vialidadEstado` para corte total; no se parsean observaciones largas en v1. |

---

## 9. Limitaciones conocidas

- Cualquier **lluvia** o **llovizna** en el texto del pronóstico dispara tier `rain` y puede subir a `moderate` aunque la lluvia sea leve.
- **Corte total** solo por coincidencia con `isVialidadCorteTotal` sobre `vialidadEstado`; texto libre en observaciones no se evalúa en v1.
- **`applyPassRefresh.ts`** (`PassRefreshEnvelope`) aún **no** tipa ni actualiza `cristoRisk` en el cliente; al añadir UI habrá que alinear tipos y DOM.

---

## 10. Etapas futuras (resumen)

Detalle en [`risk-engine-roadmap.md`](./risk-engine-roadmap.md): UI, PNG, histórico Redis, mejoras analíticas.

---

## 11. Ejemplo de payload (reducido)

Respuesta típica de `GET /api/snapshot/cristo-redentor` (solo fragmento de `cristoRisk`):

```json
{
  "cristoRisk": {
    "schemaVersion": 1,
    "slug": "cristo-redentor",
    "computedAt": "2026-04-17T12:00:00.000Z",
    "level": "moderate",
    "headline": "Riesgo moderado",
    "summary": "Hay algunas señales (clima, visibilidad o datos incompletos) que conviene tener en cuenta antes de viajar. Esto no reemplaza el estado oficial de arriba.",
    "reasons": [{ "code": "forecast_rain" }],
    "confidence": "high",
    "audit": {
      "badgeStatus": "abierto",
      "drivingLevel": "caution",
      "forecastTier": "rain",
      "vialidadEstado": "HABILITADA"
    }
  }
}
```

Otros pasos: la propiedad **`cristoRisk` no aparece** en el JSON (no `null` explícito a menos que se serialice de otro modo; el spread en `buildPassRefreshPayload` omite la clave).

---

## 12. Checklist al modificar esta lógica

- [ ] No tocar `inferPassStatus` salvo necesidad global del producto; el riesgo debe seguir siendo **derivado**.
- [ ] Cualquier cambio en keywords de pronóstico debe actualizar **a la vez** `forecastAdverseSignals.ts` y el ramal de `forecastAssessment` en `drivingConditions.ts` si deben seguir alineados.
- [ ] Mantener `schemaVersion` o documentar un salto de versión.
- [ ] Probar `GET /api/snapshot/cristo-redentor` y un paso distinto (sin `cristoRisk`).
- [ ] Revisar impacto futuro en `applyPassRefresh.ts` cuando exista card en cliente.
- [ ] Actualizar **este documento** y el roadmap si cambian reglas o contrato.
