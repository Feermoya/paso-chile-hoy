export interface HeroScheduleDisplay {
  primary: string;
  detail?: string;
}

function formatClockToken(token: string): string {
  const digits = token.replace(/\D/g, "");
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  if (digits.length === 3) {
    return `0${digits.slice(0, 1)}:${digits.slice(1)}`;
  }
  const colon = token.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    return `${colon[1].padStart(2, "0")}:${colon[2]}`;
  }
  return token;
}

function sentenceCaseEs(text: string): string {
  const t = text.trim().toLowerCase();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/^horario:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convierte texto crudo de Gendarmería/Vialidad en líneas legibles para el hero. */
export function formatHeroSchedule(raw: string): HeroScheduleDisplay | null {
  const input = normalizeInput(raw);
  if (!input) return null;

  if (/habilitado\s+las\s+24\s*hs?/i.test(input) || /^24\s*hs?$/i.test(input)) {
    return { primary: "Habilitado las 24 horas" };
  }

  let m = input.match(/habilitado\s+de\s+las?\s+(\d{3,4})\s*hs?\s+a\s+(\d{3,4})\s*hs?/i);
  if (m) {
    return {
      primary: `Habilitado de ${formatClockToken(m[1])} a ${formatClockToken(m[2])}`,
    };
  }

  m = input.match(/habilitado\s+(?:para\s+)?(.+?)\s+de\s+(\d{3,4})\s+a\s+(\d{3,4})\s*hs?/i);
  if (m) {
    const from = formatClockToken(m[2]);
    const to = formatClockToken(m[3]);
    const qualifier = sentenceCaseEs(m[1].trim());
    if (/todo tipo de transporte/i.test(qualifier)) {
      return {
        primary: `De ${from} a ${to}`,
        detail: "Todo tipo de transporte",
      };
    }
    return {
      primary: `De ${from} a ${to}`,
      detail: qualifier,
    };
  }

  m = input.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})\s*h?\.?/i);
  if (m) {
    return {
      primary: `De ${formatClockToken(m[1])} a ${formatClockToken(m[2])}`,
    };
  }

  m = input.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (m) {
    return {
      primary: `${formatClockToken(m[1])} a ${formatClockToken(m[2])}`,
    };
  }

  m = input.match(/de\s+las?\s+(\d{3,4})\s*hs?\s+a\s+(\d{3,4})\s*hs?/i);
  if (m) {
    return {
      primary: `De ${formatClockToken(m[1])} a ${formatClockToken(m[2])}`,
    };
  }

  m = input.match(/de\s+(\d{3,4})\s+a\s+(\d{3,4})\s*hs?/i);
  if (m) {
    return {
      primary: `De ${formatClockToken(m[1])} a ${formatClockToken(m[2])}`,
    };
  }

  const cleaned = sentenceCaseEs(
    input.replace(/\s+hs\b/gi, " h").replace(/\bhs\b/gi, " h"),
  );
  return { primary: cleaned };
}

/** Actualiza el bloque de horario del hero tras refresh en cliente. */
export function applyHeroScheduleToDom(root: ParentNode, scheduleText: string): void {
  const row = root.querySelector("[data-hero-schedule-row]");
  const primary = root.querySelector("[data-hero-schedule-primary]");
  const detail = root.querySelector("[data-hero-schedule-detail]");
  const display = formatHeroSchedule(scheduleText);

  if (!display) {
    row?.classList.add("hidden");
    if (primary) primary.textContent = "";
    if (detail instanceof HTMLElement) {
      detail.textContent = "";
      detail.classList.add("hidden");
    }
    return;
  }

  row?.classList.remove("hidden");
  if (primary) primary.textContent = display.primary;
  if (detail instanceof HTMLElement) {
    if (display.detail?.trim()) {
      detail.textContent = display.detail;
      detail.classList.remove("hidden");
    } else {
      detail.textContent = "";
      detail.classList.add("hidden");
    }
  }
}
