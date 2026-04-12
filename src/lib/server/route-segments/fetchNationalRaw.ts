import type { NationalRouteRow } from "@/types/route-segments";
import { parseSheetValuesToNationalRows } from "@/lib/server/route-segments/parseNationalRows";

const DEFAULT_SPREADSHEET_ID = "17AqjqeNvM4nG6cOUsUFKFaKXMiNmztYfzHIxeM9FcXk";
const DEFAULT_RANGE = "tablavisible";

export interface GoogleSheetValuesResponse {
  range?: string;
  majorDimension?: string;
  values?: string[][];
}

function buildSheetsUrl(apiKey: string): string {
  const id = process.env.GOOGLE_SHEETS_ROUTE_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
  const range = encodeURIComponent(
    process.env.GOOGLE_SHEETS_ROUTE_RANGE?.trim() || DEFAULT_RANGE,
  );
  const key = encodeURIComponent(apiKey);
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${key}&alt=json`;
}

const MISSING_KEY_MESSAGE = `[route-segments] Falta la API key de Google Sheets.

Definí la variable de entorno (preferida):
  GOOGLE_SHEETS_API_KEY

Convención del proyecto:
  • Local: creá o editá el archivo ".env.local" en la raíz del repo (no se sube a git) y agregá:
      GOOGLE_SHEETS_API_KEY=tu_clave_real
    Luego ejecutá "npm run update:rutas" (el script carga ".env.local" automáticamente).
  • CI: en GitHub → Settings → Secrets and variables → Actions → New repository secret
      Name:  GOOGLE_SHEETS_API_KEY
      Value: la misma clave (usada por .github/workflows/route-segments.yml)

Compatibilidad opcional: si ya usás GOOGLE_SHEETS_ROUTE_KEY, también se acepta (misma clave).`;

/**
 * Descarga la hoja pública y devuelve filas nacionales normalizadas.
 * Variable preferida: `GOOGLE_SHEETS_API_KEY`. Alternativa: `GOOGLE_SHEETS_ROUTE_KEY`.
 */
export async function fetchNationalRouteRows(): Promise<NationalRouteRow[]> {
  const apiKey =
    process.env.GOOGLE_SHEETS_API_KEY?.trim() || process.env.GOOGLE_SHEETS_ROUTE_KEY?.trim();
  if (!apiKey) {
    throw new Error(MISSING_KEY_MESSAGE);
  }

  const url = buildSheetsUrl(apiKey);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[route-segments] Sheets HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as GoogleSheetValuesResponse;
  const values = json.values;
  if (!values?.length) {
    throw new Error("[route-segments] Respuesta Sheets sin `values`.");
  }

  return parseSheetValuesToNationalRows(values);
}
