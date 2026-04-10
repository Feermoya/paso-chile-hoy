import type { PassView } from "@/types/pass-view";

/**
 * Estado mostrable inferido para la UI. No existe en la fuente HTML como campo estructurado:
 * se deriva de alertas, horario publicado y presencia mínima de datos. Puede equivocarse.
 */
export type PassDisplayStatus = "abierto" | "condicionado" | "cerrado" | "sin_datos";

function alertText(view: PassView): string {
  return view.alerts
    .map((a) => [a.source, a.title, a.description, a.detail].filter(Boolean).join(" "))
    .join(" ");
}

const closedRe =
  /cerrad[oa](\s|$|[^a-z])|cierre|prohibid|inhabilit|no\s+circul|suspendid|imposibilit|no\s+habilit/i;
const conditionalRe =
  /condicionad|restring|restricci|prioridad|solo\s+[^.]{0,40}veh|calzada|desvío|precaución|nevada|meteorol|tunel|túnel|horario\s+de\s+24/i;
const scheduleOpenRe = /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/;
const scheduleClosedPhrase = /cerrado\s*\(\s*siempre\s*\)|cerrado\s+siempre/i;

/**
 * Prioridad: cerrado → condicionado → abierto (señales positivas) → sin_datos.
 */
export function inferPassStatus(view: PassView): PassDisplayStatus {
  const sched = view.operationalInfo.schedule ?? "";
  const blob = `${alertText(view)} ${sched}`.trim();

  if (!blob && !view.title) return "sin_datos";

  if (scheduleClosedPhrase.test(sched) || closedRe.test(blob)) {
    return "cerrado";
  }

  if (conditionalRe.test(blob)) {
    return "condicionado";
  }

  if (scheduleOpenRe.test(sched)) {
    return "abierto";
  }

  if (/\b24\s*h/i.test(sched) && !scheduleClosedPhrase.test(sched)) {
    return "abierto";
  }

  if (view.alerts.length > 0) {
    return "condicionado";
  }

  if (view.weather?.now || (view.weather?.forecast?.length ?? 0) > 0 || sched) {
    return "abierto";
  }

  return "sin_datos";
}
