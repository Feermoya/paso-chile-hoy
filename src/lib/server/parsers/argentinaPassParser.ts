import { parse, type HTMLElement } from "node-html-parser";

import type {
  AlertRaw,
  ContactRaw,
  ForecastItemRaw,
  GpsRaw,
  LinkRaw,
  PassRaw,
  ProviderRaw,
  WeatherNowRaw,
} from "@/types/pass-raw";
import { normalizeText } from "@/lib/server/utils/htmlText";
import {
  absolutizeArgentinaGobHref,
  extractRouteIdFromUrl,
  parseProviderDateToIso,
  parseProviderLine,
  parseScheduleLine,
  parseTemperatureC,
  parseVisibilityKm,
} from "@/lib/server/utils/parseHelpers";

export type ParseContext = {
  slug: string;
  sourceUrl: string;
  /** ISO 8601 UTC del momento del scraping. */
  scrapedAt: string;
};

function opt(s: string | undefined | null): string | undefined {
  const t = normalizeText(s);
  return t || undefined;
}

function findMainColumn(root: HTMLElement): HTMLElement | null {
  return root.querySelector('div.col-md-9[itemscope]') ?? root.querySelector("div.col-md-9");
}

function paragraphStartingWith(scope: HTMLElement, lowerPrefix: string): string | null {
  for (const p of scope.querySelectorAll("p")) {
    const t = normalizeText(p.textContent);
    if (t.toLowerCase().startsWith(lowerPrefix)) return t;
  }
  return null;
}

function parseLadoLine(text: string): { province: string | undefined; country: string | undefined } {
  const m = text.match(/Lado argentino:\s*([^|]+)\s*\|\s*País limítrofe:\s*(.+)/i);
  if (!m) return { province: undefined, country: undefined };
  return {
    province: opt(m[1]),
    country: opt(m[2]),
  };
}

function collectFollowingSiblings(start: HTMLElement, stopTags: string[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  let n = start.nextElementSibling as HTMLElement | null;
  while (n) {
    const tag = n.tagName.toLowerCase();
    if (stopTags.includes(tag)) break;
    out.push(n);
    n = n.nextElementSibling as HTMLElement | null;
  }
  return out;
}

function parseAlerts(scope: HTMLElement | null): AlertRaw[] {
  if (!scope) return [];
  const alerts: AlertRaw[] = [];
  for (const h5 of scope.querySelectorAll("h5")) {
    if (normalizeText(h5.textContent) !== "Atención") continue;
    const siblings = collectFollowingSiblings(h5, ["h5", "h3", "h2", "section"]);
    let source: string | undefined;
    let description: string | undefined;
    let detail: string | undefined;
    for (const el of siblings) {
      if (el.tagName.toLowerCase() !== "p") continue;
      const full = normalizeText(el.textContent);
      if (!full) continue;
      const m = full.match(/^(.+?)\s+informa:\s*(.+)$/i);
      if (!m) continue;
      source = opt(m[1]);
      const afterInforma = m[2].trim();
      const strong = el.querySelector("strong");
      if (strong) {
        description = opt(strong.textContent);
        const ds = normalizeText(strong.textContent);
        let rest = normalizeText(afterInforma.replace(ds, ""));
        rest = rest.replace(/^[\s,.;:-]+/, "").trim();
        detail = opt(rest);
      } else {
        detail = opt(afterInforma);
      }
      break;
    }
    if (source || description || detail) {
      alerts.push({ source, title: "Atención", description, detail });
    }
  }
  return alerts;
}

function parseLocalitiesFromH3(main: HTMLElement | null): {
  localityAR?: string;
  localityCL?: string;
} {
  const h3 =
    main?.querySelector('[itemprop="geo"] h3') ?? main?.querySelector("h2 ~ h3") ?? main?.querySelector("h3");
  const line = opt(h3?.textContent);
  if (!line) return {};
  const m = line.match(/^(.+?)\s*\(\s*AR\s*\)\s*-\s*(.+?)\s*\(\s*CL\s*\)\s*$/i);
  if (m) {
    return { localityAR: opt(m[1]), localityCL: opt(m[2]) };
  }
  const parts = line.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      localityAR: opt(parts[0].replace(/\(\s*AR\s*\)\s*$/i, "").trim()),
      localityCL: opt(parts[1].replace(/\(\s*CL\s*\)\s*$/i, "").trim()),
    };
  }
  return {};
}

function parseRouteDescriptionSmall(main: HTMLElement | null): string | undefined {
  const small =
    main?.querySelector('[itemprop="geo"] h3 small') ?? main?.querySelector("h2 ~ h3 small");
  return opt(small?.textContent);
}

function parseContact(main: HTMLElement | null): ContactRaw | undefined {
  const tel = main?.querySelector('a[href^="tel:"]');
  const telHref = opt(tel?.getAttribute("href"));
  const phoneFromLink = opt(tel?.textContent);
  const telSpan = main?.querySelector('span[itemprop="telephone"]');
  const phoneFromSpan = opt(telSpan?.textContent);
  const phone = phoneFromLink ?? phoneFromSpan;
  if (!phone && !telHref) return undefined;
  return { phone, telHref };
}

function parseGps(main: HTMLElement | null): GpsRaw | undefined {
  const a = main?.querySelector('a[href^="geo:"]');
  const geoHref = opt(a?.getAttribute("href"));
  if (!geoHref) return undefined;
  const m = geoHref.match(/geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  const lat = m ? Number(m[1]) : undefined;
  const lng = m ? Number(m[2]) : undefined;
  const latOk = lat != null && Number.isFinite(lat);
  const lngOk = lng != null && Number.isFinite(lng);
  return {
    lat: latOk ? lat : undefined,
    lng: lngOk ? lng : undefined,
    geoHref,
  };
}

function parseCurrentWeather(section: HTMLElement | null): WeatherNowRaw | undefined {
  if (!section) return undefined;

  const smnTime = section.querySelector("details.pi-tooltip time[datetime]");
  const providerNote = opt(smnTime?.getAttribute("datetime"));

  const hw = section.querySelector(".header-weather");
  const dlMain = hw?.querySelector("dl.definition-list");
  const dds = dlMain?.querySelectorAll("dd");
  let temperatureC: number | undefined;
  let description: string | undefined;
  if (dds && dds.length >= 2) {
    const t0 = parseTemperatureC(normalizeText(dds[0].textContent));
    temperatureC = t0 != null ? t0 : undefined;
    description = opt(dds[1].textContent);
  }

  let wind: string | undefined;
  let sunrise: string | undefined;
  let sunset: string | undefined;
  let visibilityKm: number | undefined;
  let visibilityText: string | undefined;

  for (const item of section.querySelectorAll("dl.weather__info-item")) {
    const dt = normalizeText(item.querySelector("dt")?.textContent).toLowerCase();
    const dd = item.querySelector("dd");
    const val = opt(dd?.textContent);
    if (!val) continue;
    if (dt.includes("viento")) wind = val;
    else if (dt.includes("salida del sol")) sunrise = val;
    else if (dt.includes("puesta del sol")) sunset = val;
    else if (dt.includes("visibilidad")) {
      const km = parseVisibilityKm(val);
      if (km != null) visibilityKm = km;
      else visibilityText = val;
    }
  }

  if (
    description == null &&
    wind == null &&
    sunrise == null &&
    sunset == null &&
    visibilityKm == null &&
    visibilityText == null &&
    temperatureC == null &&
    providerNote == null
  ) {
    return undefined;
  }

  return {
    description,
    temperatureC,
    wind,
    visibilityKm,
    visibilityText,
    sunrise,
    sunset,
    providerNote,
  };
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

function parseForecastRows(details: HTMLElement | null): ForecastItemRaw[] {
  if (!details) return [];
  const rows = details.querySelectorAll("div.row.bloque-periodo");
  const out: ForecastItemRaw[] = [];

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
      opt([windDirection, windSpeedText].filter(Boolean).join(" ").trim());

    const visDd = cols[3].querySelector("dl dd:last-of-type");
    let visibility = opt(visDd?.textContent);
    if (visibility) {
      const vm = visibility.match(/^vis\.?\s*(.+)$/i);
      if (vm) visibility = opt(vm[1]);
    }

    if (period || description || temperatureC != null || wind || visibility) {
      out.push({ period, description, temperatureC, wind, visibility });
    }
  }

  return out;
}

function parseUsefulLinks(root: HTMLElement): LinkRaw[] {
  const out: LinkRaw[] = [];
  for (const h of root.querySelectorAll("h3")) {
    const ht = normalizeText(h.textContent);
    if (!ht.includes("Te puede interesar")) continue;
    let sib: HTMLElement | null = h.nextElementSibling as HTMLElement | null;
    while (sib && sib.tagName !== "UL") {
      sib = sib.nextElementSibling as HTMLElement | null;
    }
    if (!sib) continue;
    for (const a of sib.querySelectorAll("li a")) {
      const text = opt(a.textContent);
      const url = absolutizeArgentinaGobHref(a.getAttribute("href")) ?? undefined;
      if (text || url) out.push({ text, url });
    }
    break;
  }
  return out;
}

function parseProviders(root: HTMLElement): ProviderRaw[] {
  const out: ProviderRaw[] = [];
  for (const h of root.querySelectorAll("h4")) {
    const ht = normalizeText(h.textContent).toLowerCase();
    if (!ht.includes("provista por") && !ht.includes("información provista")) continue;
    let sib: HTMLElement | null = h.nextElementSibling as HTMLElement | null;
    while (sib && sib.tagName !== "UL") {
      sib = sib.nextElementSibling as HTMLElement | null;
    }
    if (!sib) break;
    for (const li of sib.querySelectorAll("li")) {
      const line = normalizeText(li.textContent);
      if (!line) continue;
      const { name, updatedAt } = parseProviderLine(line);
      const n = opt(name);
      if (!n) continue;
      const lastUpdatedRaw = updatedAt ?? undefined;
      out.push({
        name: n,
        lastUpdatedRaw,
        lastUpdated: parseProviderDateToIso(updatedAt),
      });
    }
    break;
  }
  return out;
}

/**
 * Parser del HTML público de Argentina.gob.ar (detalle de paso internacional).
 * Emite `PassRaw` alineado a `src/types/pass-raw.ts` (sin estado operativo scrapeable fiable).
 */
export function parseArgentinaPassHtml(html: string, ctx: ParseContext): PassRaw {
  const root = parse(html, { blockTextElements: { script: true, style: true } });

  const main = findMainColumn(root);

  let provinceAR: string | undefined;
  let countryCL: string | undefined;
  const ladoEl = main?.querySelector("p.lado");
  if (ladoEl?.textContent) {
    const parsed = parseLadoLine(normalizeText(ladoEl.textContent));
    provinceAR = parsed.province;
    countryCL = parsed.country;
  }
  if ((!provinceAR || !countryCL) && main?.textContent) {
    const parsed = parseLadoLine(normalizeText(main.textContent));
    provinceAR = provinceAR ?? parsed.province;
    countryCL = countryCL ?? parsed.country;
  }

  const nameSpan = main?.querySelector('h2 span[itemprop="name"]');
  let name =
    opt(nameSpan?.textContent) ||
    opt(main?.querySelector("h2")?.textContent) ||
    undefined;
  if (!name) {
    const og = root.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
    const head = opt(og.split("|")[0]);
    name = head;
  }

  const { localityAR, localityCL } = parseLocalitiesFromH3(main);
  const routeDescription = parseRouteDescriptionSmall(main);

  const scheduleFromP = main ? paragraphStartingWith(main, "horario:") : null;
  const metaOh = main?.querySelector('meta[itemprop="openingHours"]');
  const metaContent = opt(metaOh?.getAttribute("content"));
  const scheduleLine =
    scheduleFromP ?? (metaContent ? `Horario: ${metaContent}` : null);
  const { schedule, scheduleFrom, scheduleTo } = parseScheduleLine(scheduleLine);

  const contact = parseContact(main);
  const gps = parseGps(main);
  const alerts = parseAlerts(main);

  const climaSection = main?.querySelector("section.clima-pasos");
  const currentWeather = parseCurrentWeather(climaSection ?? null);

  const forecastDetails = root.querySelector("details.pronostico-ext");
  const forecast = parseForecastRows(forecastDetails);

  const usefulLinks = parseUsefulLinks(root);
  const providers = parseProviders(root);

  const routeId = extractRouteIdFromUrl(ctx.sourceUrl);

  return {
    slug: ctx.slug,
    routeId,
    name,
    localityAR,
    localityCL,
    provinceAR,
    countryCL,
    routeDescription,
    schedule,
    scheduleFrom,
    scheduleTo,
    contact,
    gps,
    alerts,
    currentWeather,
    forecast,
    usefulLinks,
    providers,
    scrapedAt: ctx.scrapedAt,
    sourceUrl: ctx.sourceUrl,
  };
}
