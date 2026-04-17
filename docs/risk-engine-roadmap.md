# Roadmap — Pass Risk Engine (Cristo Redentor)

**Alcance explícito del producto actual:** solo `cristo-redentor`. Las etapas siguientes **no** generalizan automáticamente a otros pasos salvo decisión explícita de producto.

**Especificación técnica de la v1 implementada:** [`cristo-redentor-risk-v1.md`](./cristo-redentor-risk-v1.md).

---

## Etapa 1 — Backend y payload (hecho)

| | |
|--|--|
| **Objetivo** | Exponer `cristoRisk` en `PassPageRefreshPayload` / `PassSnapshotApiEnvelope` con reglas auditables y sin tocar el badge oficial. |
| **Alcance** | Tipos, `forecastAdverseTier`, `computeCristoRedentorRiskV1`, integración en `passRefreshPayload.ts`, refactor mínimo de `drivingConditions` para compartir lógica de forecast. |
| **Qué toca** | Servidor: payload, motor, utilidades. |
| **Qué no toca** | UI, PNG, Redis, `inferPassStatus`, otros slugs. |
| **Riesgos** | Confusión de producto entre badge y riesgo; duplicación de `assessDrivingConditions` en SSR (payload + página). |
| **Validación** | `GET /api/snapshot/cristo-redentor` incluye `cristoRisk`; otros slugs no incluyen la clave; reglas revisables en código y doc. |

---

## Etapa 2 — Card UI

| | |
|--|--|
| **Objetivo** | Mostrar `cristoRisk` en la página del paso Cristo Redentor de forma claramente secundaria al hero/badge. |
| **Alcance** | Componente Astro (p. ej. bajo el grid operativo/clima), props desde `[slug].astro` o `PasoPageShell`, copy fijo o derivado de `headline`/`summary`. |
| **Qué toca** | Astro, posiblemente `PasoPageShell.astro`, estilos. |
| **Qué no toca** | Lógica del motor (sigue en servidor); no mover el badge a la card. |
| **Riesgos** | Accessibilidad, jerarquía visual vs estado oficial; refresh en cliente sin actualizar la card si no se extiende el cliente. |
| **Validación** | SSR muestra datos coherentes; POST refresh opcionalmente actualiza la card tras alinear `PassRefreshEnvelope` y `applyPassRefresh.ts`. |

---

## Etapa 3 — PNG descargable

| | |
|--|--|
| **Objetivo** | Imagen generada (p. ej. share card) con resumen de riesgo + estado, sin sustituir al OG oficial del paso salvo criterio de producto. |
| **Alcance** | Generación de imagen (p. ej. `html-to-image` ya en dependencias), ruta o acción de descarga, textos cortos desde `cristoRisk`. |
| **Qué toca** | Cliente o endpoint de imagen, assets, copy legal “informativo”. |
| **Qué no toca** | Motor de reglas, persistencia. |
| **Riesgos** | Longitud de textos, render en dark/light, mantenimiento de plantilla. |
| **Validación** | PNG legible en móvil y desktop; disclaimers visibles. |

---

## Etapa 4 — Histórico mínimo (Redis)

| | |
|--|--|
| **Objetivo** | Registrar cambios de nivel o de señales para análisis posterior o alertas, sin base SQL nueva. |
| **Alcance** | Claves Redis (lista acotada), append solo si cambia firma de evento, opcionalmente solo en producción con KV. |
| **Qué toca** | `appendRiskHistory`-style en servidor después del cálculo; posible cron de compactación. |
| **Qué no toca** | Cambiar reglas v1 salvo migración versionada. |
| **Riesgos** | Coste KV, privacidad (no guardar PII), reloj del servidor. |
| **Validación** | Eventos aparecen bajo carga controlada; fallo de Redis no rompe la página. |

---

## Etapa 5 — Mejoras futuras (opcional)

| | |
|--|--|
| **Objetivo** | Afinar sensibilidad (lluvia leve vs fuerte), más señales (observaciones vialidad), telemetría, i18n de `reasons`, experimentos A/B de copy. |
| **Alcance** | Por decisión de producto; puede implicar `schemaVersion: 2`. |
| **Qué toca** | Motor + tests cuando existan, documentación. |
| **Qué no toca** | Sustituir fuentes oficiales. |
| **Riesgos** | Sobre-ingeniería; drift entre doc y código. |
| **Validación** | Criterios de negocio explícitos antes de cada cambio. |
