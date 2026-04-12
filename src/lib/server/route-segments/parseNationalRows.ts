import type { NationalRouteRow, NationalRouteRowStatus } from "@/types/route-segments";

/** Normaliza texto de tramo para emparejar filas del sheet con `expectedSegments`. */
export function normalizeTramoKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([.,])\s*/g, "$1")
    .trim();
}

export function slugifySegmentId(canonicalName: string): string {
  return canonicalName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEstadoFromHtml(estadoHtml: string): { label: string; normalized: NationalRouteRowStatus } {
  const text = stripHtmlToText(estadoHtml).toUpperCase();
  const compact = text.replace(/\s+/g, " ").trim();

  const pick = (needle: string): boolean => compact.includes(needle);

  if (pick("CORTE TOTAL")) {
    return { label: "CORTE TOTAL", normalized: "CORTE TOTAL" };
  }
  if (pick("CORTE PARCIAL")) {
    return { label: "CORTE PARCIAL", normalized: "CORTE PARCIAL" };
  }
  if (pick("PRECAUCION") || pick("PRECAUCIÓN")) {
    return { label: compact.includes("PRECAUCIÓN") ? "PRECAUCIÓN" : "PRECAUCION", normalized: "PRECAUCION" };
  }
  if (pick("HABILITADA")) {
    return { label: "HABILITADA", normalized: "HABILITADA" };
  }

  const short = compact.slice(0, 80);
  return { label: short || "DESCONOCIDO", normalized: "DESCONOCIDO" };
}

export function parseKmText(km: string | null | undefined): number | null {
  if (km == null || !String(km).trim()) return null;
  let t = String(km).trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(",", ".");
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function parseSheetsDateToIso(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const t = String(raw).trim();
  const withTime = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (withTime) {
    const [, d, mo, y, h, min] = withTime;
    const iso = new Date(
      `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:00-03:00`,
    );
    return Number.isFinite(iso.getTime()) ? iso.toISOString() : null;
  }
  const dateOnly = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateOnly) {
    const [, d, mo, y] = dateOnly;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00.000Z`;
  }
  return null;
}

export function detectTollFromHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  const t = html.toLowerCase();
  return t.includes("peaje") || t.includes("peajes");
}

/**
 * Encuentra la fila siguiente al encabezado con "Provincia" / "Ruta".
 * Si no aparece, asume dos filas de metadatos (comportamiento previo al sheet real).
 */
export function findNationalDataStartRowIndex(values: string[][]): number {
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row?.length) continue;
    const c0 = row[0]?.trim().toLowerCase();
    const c1 = row[1]?.trim().toLowerCase();
    if (c0 === "provincia" && c1 === "ruta") {
      return i + 1;
    }
  }
  return Math.min(2, values.length);
}

function cell(row: string[] | undefined, i: number): string {
  const v = row?.[i];
  return v == null ? "" : String(v);
}

export function parseNationalRow(row: string[]): NationalRouteRow | null {
  if (row.length < 6) return null;

  const province = cell(row, 0).trim();
  const routeCode = cell(row, 1).trim();
  const tramo = cell(row, 2).trim();
  const estadoHtml = cell(row, 3);
  const calzadaRaw = cell(row, 4).trim();
  const kmTextRaw = cell(row, 5).trim();
  const conoceMasHtml = cell(row, 6).trim() || null;
  const observacionesRaw = cell(row, 7).trim();
  const updatedAtText = cell(row, 8).trim() || null;

  if (!province || !routeCode || !tramo) return null;

  const { label: estadoLabel, normalized: estadoNormalized } = parseEstadoFromHtml(estadoHtml);

  return {
    province,
    routeCode,
    tramo,
    estadoHtml,
    estadoLabel,
    estadoNormalized,
    calzada: calzadaRaw || null,
    kmText: kmTextRaw || null,
    kmValue: parseKmText(kmTextRaw),
    conoceMasHtml,
    observaciones: observacionesRaw || null,
    updatedAtText,
    updatedAtIso: parseSheetsDateToIso(updatedAtText),
  };
}

export function parseSheetValuesToNationalRows(values: string[][] | null | undefined): NationalRouteRow[] {
  if (!values?.length) return [];
  const start = findNationalDataStartRowIndex(values);
  const out: NationalRouteRow[] = [];
  for (let i = start; i < values.length; i++) {
    const row = values[i];
    if (!row?.some((c) => String(c).trim())) continue;
    const parsed = parseNationalRow(row);
    if (parsed) out.push(parsed);
  }
  return out;
}
