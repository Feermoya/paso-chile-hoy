import type { PassStatus } from "@/lib/server/types/pass";
import { normalizeText } from "@/lib/server/utils/htmlText";

/** `id` numérico en URLs `/detalle/ruta/{id}/…`. */
export function extractRouteIdFromUrl(url: string | undefined | null): number | undefined {
  if (!url) return undefined;
  const m = url.match(/\/ruta\/(\d+)\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Fecha de proveedores: `DD/MM/YYYY - H:mm` (hora 1–2 dígitos) o solo fecha.
 * Con hora se interpreta en Argentina (-03:00) y se convierte a ISO UTC.
 * Solo fecha → medianoche UTC (sin inferir hora local).
 */
export function parseProviderDateToIso(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  let t = normalizeText(raw).replace(/\s+h$/i, "");
  const withTime = t.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (withTime) {
    const [, day, month, year, hh, mm] = withTime;
    const h = hh.padStart(2, "0");
    const d = new Date(`${year}-${month}-${day}T${h}:${mm}:00-03:00`);
    return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
  }
  const dateOnly = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }
  return undefined;
}

/** Línea tipo `Horario: 09:00-21:00` o texto libre (`24 hs`, etc.). */
export function parseScheduleLine(
  line: string | null | undefined,
): { schedule?: string; scheduleFrom?: string; scheduleTo?: string } {
  if (!line) return {};
  const full = normalizeText(line);
  const value = full.replace(/^horario:\s*/i, "").trim();
  const range = value.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (range) {
    return {
      schedule: full,
      scheduleFrom: range[1],
      scheduleTo: range[2],
    };
  }
  return { schedule: full || undefined };
}

/** Lee `var nombre = "..."` o `var nombre = '...'` en HTML (bloques inline del sitio). */
export function extractScriptStringVar(html: string, varName: string): string | null {
  const quoted = [
    new RegExp(`var\\s+${varName}\\s*=\\s*"([^"]*)"`, "m"),
    new RegExp(`var\\s+${varName}\\s*=\\s*'([^']*)'`, "m"),
  ];
  for (const re of quoted) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

export function parseTemperatureC(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function parseVisibilityKm(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = normalizeText(raw).match(/(\d+(?:\.\d+)?)\s*km/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Estado operativo a partir de variables publicadas en el HTML (misma lógica que el JS del sitio,
 * sin ejecutar `opening_hours` en Node). Si el paso está ABIERTO según prioridad pero fuera de
 * franja horaria, el sitio lo mostraría Cerrado en el cliente; aquí puede figurar `open` — ver statusText.
 */
export function derivePassStatus(
  estadoPrioridad: string | null,
  estadoVialidad: string | null,
  scheduleLine: string | null,
): { status: PassStatus; statusText: string | null } {
  const schedFull = scheduleLine ? normalizeText(scheduleLine) : "";
  const prioridad = estadoPrioridad?.toUpperCase().trim() ?? "";
  const vialidad = estadoVialidad?.trim() ?? "";

  if (schedFull && /cerrado\s*\(\s*siempre\s*\)/i.test(schedFull)) {
    return {
      status: "closed",
      statusText: schedFull.replace(/^horario:\s*/i, "").trim() || null,
    };
  }

  if (prioridad === "CERRADO") {
    return {
      status: "closed",
      statusText: schedFull.replace(/^horario:\s*/i, "").trim() || null,
    };
  }

  if (vialidad === "RESTRINGIDA" || vialidad === "CORTE TOTAL") {
    return {
      status: "conditional",
      statusText: "Vialidad restringida o con corte total según datos publicados.",
    };
  }

  if (prioridad.includes("CONDICION")) {
    return { status: "conditional", statusText: schedFull || null };
  }

  if (prioridad === "ABIERTO" || prioridad === "HABILITADO") {
    if (vialidad === "HABILITADA" || vialidad === "") {
      return {
        status: "open",
        statusText: null,
      };
    }
  }

  if (prioridad && prioridad !== "ABIERTO" && prioridad !== "CERRADO") {
    return { status: "unknown", statusText: schedFull || prioridad };
  }

  return { status: "unknown", statusText: schedFull || null };
}

export function absolutizeArgentinaGobHref(href: string | undefined | null): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h) return null;
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  if (h.startsWith("//")) return `https:${h}`;
  if (h.startsWith("/")) return `https://www.argentina.gob.ar${h}`;
  return `https://www.argentina.gob.ar/${h}`;
}

/** "Organismo (última actualización dd/mm/yyyy - HH:MM h)" → nombre + fecha cruda. */
export function parseProviderLine(line: string): { name: string; updatedAt: string | null } {
  const t = normalizeText(line);
  const m = t.match(/^(.*?)\s*\(\s*última actualización\s+(.+?)\s*\)\s*$/i);
  if (m) {
    return { name: normalizeText(m[1]), updatedAt: normalizeText(m[2]) || null };
  }
  return { name: t, updatedAt: null };
}
