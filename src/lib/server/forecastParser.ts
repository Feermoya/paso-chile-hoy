import { parse, type HTMLElement } from "node-html-parser";

import { normalizeText } from "@/lib/server/utils/htmlText";
import { parseTemperatureC } from "@/lib/server/utils/parseHelpers";

export interface ForecastPeriod {
  period?: string;
  description?: string;
  temperatureC?: number;
  wind?: string | null;
  visibility?: string | null;
}

function opt(s: string | undefined | null): string | undefined {
  const t = normalizeText(s);
  return t || undefined;
}

function forecastWindParts(windDd: HTMLElement | null): {
  windDirection: string | null;
  windSpeedText: string | null;
} {
  if (!windDd) return { windDirection: null, windSpeedText: null };
  const abbr = windDd.querySelector("abbr");
  const dir = abbr?.getAttribute("title")?.trim() || normalizeText(abbr?.textContent) || null;
  const full = normalizeText(windDd.textContent) || null;
  return { windDirection: dir, windSpeedText: full };
}

/** Pronóstico 24 h desde el HTML de detalle (`details.pronostico-ext`). */
export function parseForecastFromHTML(html: string): ForecastPeriod[] {
  const root = parse(html);
  const details = root.querySelector("details.pronostico-ext");
  if (!details) return [];
  const rows = details.querySelectorAll("div.row.bloque-periodo");
  const out: ForecastPeriod[] = [];

  for (const row of rows) {
    const cols = row.querySelectorAll(":scope > div");
    if (cols.length < 4) continue;

    const period = opt(cols[0].querySelector("p")?.textContent);
    const tempDl = cols[1].querySelector("dl");
    const tempStrong = tempDl?.querySelector("dd strong");
    const tempParsed = parseTemperatureC(normalizeText(tempStrong?.textContent));
    const temperatureC = tempParsed != null ? tempParsed : undefined;
    const condDds = tempDl?.querySelectorAll("dd");
    const description =
      condDds && condDds.length > 1
        ? opt(condDds[condDds.length - 1]?.textContent)
        : undefined;

    const windCol = cols[2];
    const windDd = windCol.querySelector("dl dd:last-of-type");
    const { windDirection, windSpeedText } = forecastWindParts(windDd);
    const wind =
      opt(windSpeedText) ??
      opt([windDirection, windSpeedText].filter(Boolean).join(" ").trim()) ??
      null;

    const visDd = cols[3].querySelector("dl dd:last-of-type");
    let visibility = opt(visDd?.textContent);
    if (visibility) {
      const vm = visibility.match(/^vis\.?\s*(.+)$/i);
      if (vm) visibility = opt(vm[1]);
    }

    if (period || description || temperatureC != null || wind || visibility) {
      out.push({ period, description, temperatureC, wind, visibility: visibility ?? null });
    }
  }

  return out;
}
