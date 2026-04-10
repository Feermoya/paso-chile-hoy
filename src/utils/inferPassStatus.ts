import type { PassView } from "@/types/pass-view";

export type PassDisplayStatus = "abierto" | "condicionado" | "cerrado" | "sin_datos";

export interface PassStatusResult {
  status: PassDisplayStatus;
  reason: string;
  confidence: "high" | "medium" | "low";
  /** Origen del estado inferido (solo Gendarmería u horario; la vialidad no define el estado del paso). */
  source?: "gendarmeria" | "horario";
  /** Si el badge es ámbar (condicionado) pero el texto debe seguir siendo el de Gendarmería (p. ej. ABIERTO). */
  displayLabel?: string;
  opensInMinutes?: number;
  closesInMinutes?: number;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
      .map((a) =>
        [a.rawText, a.source, a.title, a.description, a.detail].filter(Boolean).join(" "),
      )
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
  "apertura demorada",
  "demora en apertura",
  "apertura condicionada",
  "habilitado con restricciones",
  "solo 4x4",
  "solo vehiculos livianos",
  "solo livianos",
  "con precaucion",
  "precaucion",
  "restringido",
  "condicionado",
  "trafico lento",
  "demoras",
  "paso lento",
  "convoys",
  "convoy",
  "con escolta",
  "restricc",
  "restringida",
  "prioridad",
  "calzada",
  "desvio",
  "desvío",
  "nevada",
  "meteorol",
  "tunel",
];

const SCHEDULE_CLOSED_PHRASE = /cerrado\s*\(\s*siempre\s*\)|cerrado\s+siempre/i;

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
        source: "horario",
        closesInMinutes: minutesUntilClose,
      };
    }
    return {
      status: "abierto",
      reason: `Dentro del horario operativo ${scheduleLabel} (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
      confidence: "high",
      source: "horario",
      closesInMinutes: minutesUntilClose > 0 ? minutesUntilClose : undefined,
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
    source: "horario",
    opensInMinutes: opensIn,
  };
}

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
        source: "horario",
        closesInMinutes: minutesUntilClose,
      };
    }
    return {
      status: "abierto",
      reason: `Dentro del horario operativo ${scheduleLabel} (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
      confidence: "high",
      source: "horario",
      closesInMinutes: minutesUntilClose > 0 ? minutesUntilClose : undefined,
    };
  }

  const opensIn = openMinutes - currentMinutes;
  const hoursUntil = Math.floor(opensIn / 60);
  const minsUntil = opensIn % 60;
  return {
    status: "cerrado",
    reason: `Fuera del horario operativo ${scheduleLabel}. Abre en ${hoursUntil}h ${minsUntil}min (hora AR: ${pad2(currentH)}:${pad2(currentM)})`,
    confidence: "high",
    source: "horario",
    opensInMinutes: opensIn,
  };
}

function hhmmFromCompactDigits(s: string): { h: number; m: number } | null {
  const p = s.padStart(4, "0");
  if (p.length !== 4 || !/^\d{4}$/.test(p)) return null;
  const h = parseInt(p.slice(0, 2), 10);
  const m = parseInt(p.slice(2, 4), 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m > 59 || h > 23) return null;
  return { h, m };
}

function evaluateSchedule(schedule: string, now: Date = new Date()): PassStatusResult | null {
  const cleaned = schedule.replace(/^horario:\s*/i, "").trim();
  const lower = cleaned.toLowerCase();

  const closedInSchedule = ["cerrado", "no habilitado", "inhabilitado", "suspendido"];
  if (closedInSchedule.some((k) => lower.includes(k))) {
    return {
      status: "cerrado",
      reason: "Horario publicado indica cierre o restricción",
      confidence: "high",
      source: "horario",
    };
  }

  const standardMatch = cleaned.match(
    /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*h?\.?/i,
  );
  if (standardMatch) {
    const openH = parseInt(standardMatch[1], 10);
    const openM = parseInt(standardMatch[2], 10);
    const closeH = parseInt(standardMatch[3], 10);
    const closeM = parseInt(standardMatch[4], 10);
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

  const upper = cleaned.toUpperCase();
  if (upper.includes("HABILITADO")) {
    const egresoMatch = cleaned.match(/EGRESO[^\d]*(\d{1,4})\s*A\s*(\d{1,4})/i);
    if (egresoMatch) {
      const openPart = hhmmFromCompactDigits(egresoMatch[1]);
      const closePart = hhmmFromCompactDigits(egresoMatch[2]);
      if (!openPart || !closePart) {
        return {
          status: "abierto",
          reason: "Paso habilitado según texto oficial (horario no interpretable)",
          confidence: "medium",
          source: "horario",
        };
      }

      const openMinutes = openPart.h * 60 + openPart.m;
      const closeMinutes = closePart.h * 60 + closePart.m;
      const scheduleLabel = `${pad2(openPart.h)}:${pad2(openPart.m)}–${pad2(closePart.h)}:${pad2(closePart.m)} (egreso)`;

      if (openMinutes === closeMinutes) {
        return {
          status: "abierto",
          reason: "Paso habilitado según texto oficial",
          confidence: "medium",
          source: "horario",
        };
      }

      if (openMinutes < closeMinutes) {
        return evaluateSameDayWindow(scheduleLabel, openMinutes, closeMinutes, now);
      }
      return evaluateOvernightWindow(scheduleLabel, openMinutes, closeMinutes, now);
    }

    return {
      status: "abierto",
      reason: "Paso habilitado según texto oficial",
      confidence: "medium",
      source: "horario",
    };
  }

  return null;
}

function inferFromOfficialApi(view: PassView, now: Date): PassStatusResult {
  const motivo = view.operationalInfo.motivo?.trim() ?? null;
  const raw = view.operationalInfo.rawStatus!.trim();
  const rs = stripDiacritics(raw.toUpperCase());
  const schedule = scheduleForInference(view);

  if (rs === "CERRADO") {
    return {
      status: "cerrado",
      reason: motivo ? `Cerrado: ${motivo}` : "Estado oficial: CERRADO",
      confidence: "high",
      source: "gendarmeria",
    };
  }

  if (rs === "CONDICIONADO") {
    return {
      status: "condicionado",
      reason: motivo ? `Condicionado: ${motivo}` : "Estado oficial: CONDICIONADO",
      confidence: "high",
      source: "gendarmeria",
    };
  }

  if (rs === "ABIERTO") {
    const vialRaw = view.operationalInfo.vialidadEstado?.trim() ?? "";
    const vial = stripDiacritics(vialRaw.toUpperCase());
    const vialidadAlertaRuta =
      vial === "CORTE TOTAL" ||
      vial.includes("CORTE TOTAL") ||
      vial === "RESTRINGIDA" ||
      vial.includes("RESTRIC");

    let closesInMinutes: number | undefined;
    if (schedule) {
      const ev = evaluateSchedule(schedule, now);
      if (ev && (ev.status === "abierto" || ev.status === "condicionado")) {
        closesInMinutes = ev.closesInMinutes;
      }
    }

    if (vialidadAlertaRuta) {
      return {
        status: "condicionado",
        reason: "ABIERTO con alerta de Vialidad Nacional",
        confidence: "high",
        displayLabel: "ABIERTO",
        source: "gendarmeria",
        closesInMinutes,
      };
    }

    return {
      status: "abierto",
      reason: "Estado oficial: ABIERTO",
      confidence: "high",
      source: "gendarmeria",
      closesInMinutes,
    };
  }

  return {
    status: "sin_datos",
    reason: `Estado oficial no reconocido: ${raw}`,
    confidence: "low",
    source: "gendarmeria",
  };
}

function inferLegacyHtmlSnapshot(view: PassView, now: Date): PassStatusResult {
  const schedule = scheduleForInference(view);
  const alertText = normalizeAlertText(view);

  for (const kw of CLOSED_KEYWORDS) {
    const k = stripDiacritics(kw.toLowerCase());
    if (!alertText.includes(k)) continue;
    if (k === "cierre" && alertText.includes("motivo del cierre")) continue;
    if (
      k === "cerrado" &&
      alertText.includes("horario de atencion") &&
      (alertText.includes("09:00") || alertText.includes("17:00"))
    ) {
      continue;
    }
    return {
      status: "cerrado",
      reason: `Alerta textual: se detectó "${kw}" en las alertas`,
      confidence: "high",
      source: "gendarmeria",
    };
  }

  for (const kw of CONDITIONAL_KEYWORDS) {
    const k = stripDiacritics(kw.toLowerCase());
    if (alertText.includes(k)) {
      return {
        status: "condicionado",
        reason: `Alerta textual: se detectó "${kw}" en las alertas`,
        confidence: "high",
        source: "gendarmeria",
      };
    }
  }

  if (schedule && SCHEDULE_CLOSED_PHRASE.test(schedule)) {
    return {
      status: "cerrado",
      reason: "Horario publicado indica cierre permanente",
      confidence: "high",
      source: "horario",
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
        source: "horario",
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

/**
 * Prioriza `rawStatus` del API oficial cuando existe; si no, replica la lógica previa (HTML + alertas).
 */
export function inferPassStatus(view: PassView, now: Date = new Date()): PassStatusResult {
  const rawStatus = view.operationalInfo.rawStatus?.trim();
  if (rawStatus) {
    return inferFromOfficialApi(view, now);
  }
  return inferLegacyHtmlSnapshot(view, now);
}

/** Para UI (cards, ticker): coincide con la regla de inferencia de corte total. */
export function isVialidadCorteTotal(estado?: string | null): boolean {
  const v = stripDiacritics((estado ?? "").toUpperCase());
  return v === "CORTE TOTAL" || v.includes("CORTE TOTAL");
}
