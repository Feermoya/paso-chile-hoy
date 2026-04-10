import type { PassView } from "@/types/pass-view";

/**
 * Estado mostrable inferido. La fuente HTML no publica badge abierto/cerrado estructurado;
 * el sitio oficial lo calcula en el cliente con hora vs. horario — aquí se replica en servidor/build.
 */
export type PassDisplayStatus = "abierto" | "condicionado" | "cerrado" | "sin_datos";

export interface PassStatusResult {
  status: PassDisplayStatus;
  /** Diagnóstico (logs, UI secundaria). */
  reason: string;
  confidence: "high" | "medium" | "low";
  /** Solo si `cerrado` por fuera de horario (no por alerta textual). */
  opensInMinutes?: number;
}

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scheduleForInference(view: PassView): string | null {
  const o = view.operationalInfo;
  const raw = o.schedule?.trim();
  if (raw) {
    return raw
      .replace(/^horario:\s*/i, "")
      .replace(/\s*h\s*$/i, "")
      .trim();
  }
  if (o.scheduleFrom && o.scheduleTo) {
    const from = o.scheduleFrom.replace(/\s*h\s*$/i, "").trim();
    const to = o.scheduleTo.replace(/\s*h\s*$/i, "").trim();
    return `${from}–${to}`;
  }
  return null;
}

function normalizeAlertText(view: PassView): string {
  return stripDiacritics(
    view.alerts
      .map((a) => [a.source, a.title, a.description, a.detail].filter(Boolean).join(" "))
      .join(" ")
      .toLowerCase(),
  );
}

const CLOSED_KEYWORDS = [
  "cerrado",
  "cierre",
  "prohibido el transito",
  "prohibido el paso",
  "sin habilitacion",
  "inhabilitado",
  "suspendido",
  "corte total",
  "no se permite",
  "imposibilit",
  "no circul",
  "no habilit",
];

const CONDITIONAL_KEYWORDS = [
  "solo vehiculos livianos",
  "solo livianos",
  "con precaucion",
  "restringido",
  "condicionado",
  "trafico lento",
  "demoras",
  "paso lento",
  "convoys",
  "convoy",
  "con escolta",
  "restricc",
  "prioridad",
  "calzada",
  "desvio",
  "desvío",
  "nevada",
  "meteorol",
  "tunel",
];

const SCHEDULE_CLOSED_PHRASE = /cerrado\s*\(\s*siempre\s*\)|cerrado\s+siempre/i;

/** Hora local Argentina (sin DST). */
function getArgentinaHM(now: Date = new Date()): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return { h: hour, m: minute };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Ventana en un mismo día calendario AR: [open, close) con open < close en minutos desde medianoche.
 */
function evaluateSameDayWindow(
  scheduleLabel: string,
  openMinutes: number,
  closeMinutes: number,
  now: Date,
): PassStatusResult {
  const { h: currentH, m: currentM } = getArgentinaHM(now);
  const currentMinutes = currentH * 60 + currentM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    const minutesUntilClose = closeMinutes - currentMinutes;
    if (minutesUntilClose <= 30 && minutesUntilClose > 0) {
      const closeH = Math.floor(closeMinutes / 60);
      const closeM = closeMinutes % 60;
      return {
        status: "condicionado",
        reason: `Cierra en ${minutesUntilClose} minutos (a las ${pad2(closeH)}:${pad2(closeM)})`,
        confidence: "high",
      };
    }
    return {
      status: "abierto",
      reason: `Dentro del horario operativo ${scheduleLabel} (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
      confidence: "high",
    };
  }

  let opensIn: number;
  if (currentMinutes < openMinutes) {
    opensIn = openMinutes - currentMinutes;
  } else {
    opensIn = 24 * 60 - currentMinutes + openMinutes;
  }

  const hoursUntil = Math.floor(opensIn / 60);
  const minsUntil = opensIn % 60;
  return {
    status: "cerrado",
    reason: `Fuera del horario operativo ${scheduleLabel}. Abre en ${hoursUntil}h ${minsUntil}min (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
    confidence: "high",
    opensInMinutes: opensIn,
  };
}

/**
 * Ventana que cruza medianoche: abierto si current >= open o current < close (close es “mañana”).
 */
function evaluateOvernightWindow(
  scheduleLabel: string,
  openMinutes: number,
  closeMinutes: number,
  now: Date,
): PassStatusResult {
  const { h: currentH, m: currentM } = getArgentinaHM(now);
  const currentMinutes = currentH * 60 + currentM;

  const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  if (isOpen) {
    let minutesUntilClose: number;
    if (currentMinutes >= openMinutes) {
      minutesUntilClose = 24 * 60 - currentMinutes + closeMinutes;
    } else {
      minutesUntilClose = closeMinutes - currentMinutes;
    }
    if (minutesUntilClose <= 30 && minutesUntilClose > 0) {
      const closeH = Math.floor(closeMinutes / 60);
      const closeM = closeMinutes % 60;
      return {
        status: "condicionado",
        reason: `Cierra en ${minutesUntilClose} minutos (a las ${pad2(closeH)}:${pad2(closeM)})`,
        confidence: "high",
      };
    }
    return {
      status: "abierto",
      reason: `Dentro del horario operativo ${scheduleLabel} (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
      confidence: "high",
    };
  }

  const opensIn = openMinutes - currentMinutes;
  const hoursUntil = Math.floor(opensIn / 60);
  const minsUntil = opensIn % 60;
  return {
    status: "cerrado",
    reason: `Fuera del horario operativo ${scheduleLabel}. Abre en ${hoursUntil}h ${minsUntil}min (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
    confidence: "high",
    opensInMinutes: opensIn,
  };
}

function evaluateSchedule(schedule: string, now: Date = new Date()): PassStatusResult | null {
  const cleaned = schedule.replace(/^horario:\s*/i, "").trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const openH = parseInt(match[1], 10);
  const openM = parseInt(match[2], 10);
  const closeH = parseInt(match[3], 10);
  const closeM = parseInt(match[4], 10);
  if (
    [openH, openM, closeH, closeM].some(
      (n) => !Number.isFinite(n) || openM > 59 || closeM > 59 || openH > 23 || closeH > 23,
    )
  ) {
    return null;
  }

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const scheduleLabel = `${pad2(openH)}:${pad2(openM)}–${pad2(closeH)}:${pad2(closeM)}`;

  if (openMinutes === closeMinutes) return null;

  if (openMinutes < closeMinutes) {
    return evaluateSameDayWindow(scheduleLabel, openMinutes, closeMinutes, now);
  }
  return evaluateOvernightWindow(scheduleLabel, openMinutes, closeMinutes, now);
}

/**
 * Infiere estado en el momento de la llamada (hora Argentina vs. horario y alertas del `PassView`).
 * No persiste estado en el snapshot: solo lee datos crudos.
 *
 * **Sitio estático (`output: 'static'`):** esta función se ejecuta en **tiempo de build** al generar
 * cada HTML; el badge refleja esa hora, no la del visitante. Para estado “en vivo” en Hosting
 * estático hace falta hidratar en el cliente o regenerar el sitio con frecuencia (p. ej. CI/cron).
 * En `astro dev` se recalcula en cada petición de desarrollo.
 */
export function inferPassStatus(view: PassView, now: Date = new Date()): PassStatusResult {
  const schedule = scheduleForInference(view);
  const alertText = normalizeAlertText(view);

  for (const kw of CLOSED_KEYWORDS) {
    const k = stripDiacritics(kw.toLowerCase());
    if (alertText.includes(k)) {
      return {
        status: "cerrado",
        reason: `Alerta textual: se detectó "${kw}" en las alertas`,
        confidence: "high",
      };
    }
  }

  for (const kw of CONDITIONAL_KEYWORDS) {
    const k = stripDiacritics(kw.toLowerCase());
    if (alertText.includes(k)) {
      return {
        status: "condicionado",
        reason: `Alerta textual: se detectó "${kw}" en las alertas`,
        confidence: "high",
      };
    }
  }

  if (schedule && SCHEDULE_CLOSED_PHRASE.test(schedule)) {
    return {
      status: "cerrado",
      reason: "Horario publicado indica cierre permanente",
      confidence: "high",
    };
  }

  if (schedule) {
    const schedNorm = stripDiacritics(schedule.toLowerCase()).replace(/\s/g, "");
    if (
      schedNorm === "24hs" ||
      schedNorm === "24h" ||
      schedNorm === "0:00-24:00" ||
      schedNorm === "00:00-24:00" ||
      /\b24\s*h/i.test(schedule)
    ) {
      return {
        status: "abierto",
        reason: "Paso con horario 24 horas",
        confidence: "high",
      };
    }
  }

  if (schedule) {
    const scheduleResult = evaluateSchedule(schedule, now);
    if (scheduleResult !== null) {
      return scheduleResult;
    }
  }

  if (!schedule) {
    return {
      status: "sin_datos",
      reason: "No hay horario ni alertas determinantes",
      confidence: "low",
    };
  }

  return {
    status: "sin_datos",
    reason: `Horario presente pero no interpretable: "${schedule}"`,
    confidence: "low",
  };
}
