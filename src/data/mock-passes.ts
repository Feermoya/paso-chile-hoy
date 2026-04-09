import type { BorderPass, PassStateSnapshot } from "@/types";

/** Catálogo base de pasos (mock). En el futuro vendrá de configuración o API. */
export const borderPasses: BorderPass[] = [
  {
    id: "cristo-redentor",
    slug: "cristo-redentor",
    name: "Paso Cristo Redentor / Los Libertadores",
    shortName: "Cristo Redentor",
    regionArgentina: "Mendoza",
    regionChile: "Valparaíso",
  },
];

export const featuredPassId = "cristo-redentor";

/** Datos de demostración para la home. Reemplazar por fuentes oficiales más adelante. */
export const cristoRedentorSnapshot: PassStateSnapshot = {
  pass: borderPasses[0],
  status: "conditional",
  confidence: "medium",
  updatedAt: "2026-04-09T14:30:00-03:00",
  headline:
    "Tránsito habilitado con restricciones por condiciones meteorológicas en alta montaña. Se recomienda consultar antes de viajar.",
  weather: {
    conditions: "Parcialmente nublado, ráfagas en cumbre",
    temperatureC: 6,
    feelsLikeC: 2,
    windKmh: 45,
    visibilityKm: 4,
  },
  riskLevel: "moderate",
  scheduleSummary: "Ventanilla habitual 08:00–20:00 (referencia mock; verificar en fuentes oficiales).",
  alerts: [
    {
      id: "a1",
      title: "Prioridad a camiones en franja matutina",
      detail:
        "Según protocolo habitual del paso, puede aplicarse prioridad de circulación. Verificar señalética y personal en puesto.",
      severity: "info",
      issuedAt: "2026-04-09T10:00:00-03:00",
    },
    {
      id: "a2",
      title: "Posible demora por controles",
      detail: "Afluencia moderada. Estimar tiempo extra en punta de fila.",
      severity: "warning",
      issuedAt: "2026-04-08T18:15:00-03:00",
    },
  ],
  requirements: [
    {
      id: "r1",
      title: "Documento de identidad o pasaporte vigente",
      mandatory: true,
    },
    {
      id: "r2",
      title: "Seguro obligatorio (según tipo de vehículo)",
      detail: "Mercosur u homologado según normativa vigente.",
      mandatory: true,
    },
    {
      id: "r3",
      title: "Declaración aduanera cuando corresponda",
      mandatory: false,
    },
    {
      id: "r4",
      title: "Cadena y elementos de nieve en temporada",
      detail: "Obligatorio cuando las autoridades lo dispongan.",
      mandatory: true,
    },
  ],
};
