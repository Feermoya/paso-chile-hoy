/**
 * Validación manual del motor v1 Cristo Redentor (léxico + confidence).
 * Ejecutar: npx tsx scripts/validate-cristo-risk-engine.ts
 */
import {
  buildExtendedForecastSignal,
  type ExtendedForecastSignal,
} from "@/lib/external/mendozaExtendedForecast";
import { computeCristoRedentorRiskV1 } from "@/lib/risk/computeCristoRedentorRiskV1";
import { forecastAdverseTier } from "@/utils/forecastAdverseSignals";
import { assessDrivingConditions, weatherNowToDrivingInput } from "@/utils/drivingConditions";
import type { ForecastItemView } from "@/types/pass-view";
import type { PassView } from "@/types/pass-view";
import type { PassStatusResult } from "@/utils/inferPassStatus";

function baseView(forecast: ForecastItemView[], stale = false): PassView {
  return {
    slug: "cristo-redentor",
    title: "Cristo Redentor",
    location: {},
    operationalInfo: {},
    meta: { operationalStale: stale },
    weather: {
      now: {
        description: "Despejado",
        temperatureC: 12,
        wind: "Leve",
        visibilityKm: 20,
      },
      forecast,
    },
  } as PassView;
}

function statusAbierto(): PassStatusResult {
  return {
    status: "abierto",
    displayLabel: "ABIERTO",
    source: "gendarmeria",
    reason: "fixture",
    confidence: "high",
  };
}

function statusSinDatos(): PassStatusResult {
  return {
    status: "sin_datos",
    displayLabel: "SIN DATOS",
    source: "gendarmeria",
    reason: "fixture",
    confidence: "low",
  };
}

function runCase(
  name: string,
  view: PassView,
  status: PassStatusResult,
  hasUsableNow: boolean,
  extendedForecastSignal?: ExtendedForecastSignal,
): void {
  const now = view.weather?.now;
  const driving = assessDrivingConditions(
    now ? weatherNowToDrivingInput(now) : { temperatureC: null, wind: null, visibilityKm: null, description: "" },
    view.weather?.forecast ?? [],
  );
  const risk = computeCristoRedentorRiskV1({
    view,
    statusResult: status,
    driving,
    hasUsableNow,
    ...(extendedForecastSignal !== undefined ? { extendedForecastSignal } : {}),
  });
  const tier = forecastAdverseTier(view.weather?.forecast ?? []);
  console.log(`\n--- ${name} ---`);
  console.log("tier:", tier, "| level:", risk.level, "| confidence:", risk.confidence);
  console.log("reasons:", risk.reasons.map((r) => r.code).join(", "));
}

function main(): void {
  const open = statusAbierto();

  runCase(
    "1 abierto + tranquilo + 2 filas limpias",
    baseView(
      [
        { period: "Hoy", description: "Despejado", temperatureC: 10 },
        { period: "Noche", description: "Poco nublado", temperatureC: 5 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase(
    "2 abierto + precipitaciones (2 filas)",
    baseView(
      [
        { period: "Tarde", description: "Precipitaciones moderadas", temperatureC: 8 },
        { period: "Noche", description: "Nublado", temperatureC: 4 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase(
    "3 abierto + chaparrones",
    baseView(
      [
        { period: "1", description: "Chaparrones aislados", temperatureC: 7 },
        { period: "2", description: "Parcialmente nublado", temperatureC: 5 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase(
    "4 abierto + mal tiempo",
    baseView(
      [
        { period: "1", description: "Mal tiempo en alta montaña", temperatureC: 6 },
        { period: "2", description: "Viento sur", temperatureC: 4 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase(
    "5 abierto + tormentas",
    baseView(
      [
        { period: "1", description: "Tormentas aisladas", temperatureC: 9 },
        { period: "2", description: "Lluvia", temperatureC: 7 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase(
    "6 abierto + nevadas",
    baseView(
      [
        { period: "1", description: "Nevadas intermitentes", temperatureC: -1 },
        { period: "2", description: "Nublado", temperatureC: -2 },
      ],
      false,
    ),
    open,
    true,
  );

  runCase("7 sin_datos", baseView([{ period: "Hoy", description: "Despejado" }], false), statusSinDatos(), true);

  runCase("8 operationalStale", baseView([], true), open, true);

  runCase("9 now usable + forecast pobre (0 filas)", baseView([], false), open, true);

  runCase(
    "10 now usable + señal adversa (lluvia, 2 filas)",
    baseView(
      [
        { period: "1", description: "Lluvias débiles", temperatureC: 8 },
        { period: "2", description: "Nublado", temperatureC: 6 },
      ],
      false,
    ),
    open,
    true,
  );

  const bulletinDomingo = `
Sábado 18

Viento del oeste. Nubosidad variable. Alta Montaña: Despejado. Temperaturas promedio previstas: 12°C.

Domingo 19

Viento moderado. Alta Montaña: Mal tiempo con precipitaciones moderadas y probables nevadas. Temperaturas promedio previstas: 8°C.
`.trim();
  const forecastCortoLimpio: ForecastItemView[] = [
    { period: "Hoy", description: "Despejado", temperatureC: 10 },
    { period: "Noche", description: "Poco nublado", temperatureC: 5 },
  ];
  runCase(
    "11 boletín extendido (domingo malo) + forecast corto limpio",
    baseView(forecastCortoLimpio, false),
    open,
    true,
    buildExtendedForecastSignal(bulletinDomingo, {
      shortForecast: forecastCortoLimpio,
      scrapedAtIso: "2026-04-17T12:00:00.000Z",
    }),
  );

  runCase(
    "12 boletín sin riesgo léxico (solo nublado)",
    baseView(
      [
        { period: "Hoy", description: "Despejado", temperatureC: 10 },
        { period: "Noche", description: "Poco nublado", temperatureC: 5 },
      ],
      false,
    ),
    open,
    true,
    buildExtendedForecastSignal("Alta montaña: parcialmente nublado", {
      shortForecast: [
        { period: "Hoy", description: "Despejado", temperatureC: 10 },
        { period: "Noche", description: "Poco nublado", temperatureC: 5 },
      ],
    }),
  );

  const forecastNieve: ForecastItemView[] = [
    { period: "1", description: "Nevadas intermitentes", temperatureC: -1 },
    { period: "2", description: "Nublado", temperatureC: -2 },
  ];
  const extHigh = buildExtendedForecastSignal(bulletinDomingo, {
    shortForecast: forecastNieve,
    scrapedAtIso: "2026-04-17T12:00:00.000Z",
  });
  runCase(
    "13 ya high_complications + boletín (no baja level)",
    baseView(forecastNieve, false),
    open,
    true,
    extHigh,
  );

  console.log("\nOK: validate-cristo-risk-engine terminó.\n");
}

main();
