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

/** Agua Negra: un solo h5 con “Motivo del cierre…” y luego “Vialidad informa…” — separar en dos alertas. */
function splitAlertParagraphGroups(paragraphs: HTMLElement[]): HTMLElement[][] {
  if (paragraphs.length <= 1) return [paragraphs];
  const t0 = normalizeText(paragraphs[0].textContent).toLowerCase();
  if (!t0.includes("motivo del cierre")) return [paragraphs];
  const idx = paragraphs.findIndex(
    (p, i) => i > 0 && /\binforma\s*:/i.test(normalizeText(p.textContent)),
  );
  if (idx >= 1) {
    return [paragraphs.slice(0, idx), paragraphs.slice(idx)];
  }
  return [paragraphs];
}

/**
 * El bloque de script incluye `estadoVialidad` (HABILITADA / RESTRINGIDA / CORTE TOTAL).
 * No usamos `estadoPrioridad`: en varios pasos figura "CERRADO" aun con horario normal
 * (p. ej. Agua Negra) y rompería el inferido basado en horario + alertas HTML.
 */
function parseInlinePassStateAlerts(html: string): AlertRaw[] {
  const out: AlertRaw[] = [];
  const ev = html.match(/var\s+estadoVialidad\s*=\s*"([^"]*)"/i);
  const vialidad = ev?.[1]?.trim().toUpperCase();

  if (vialidad === "RESTRINGIDA" || vialidad === "CORTE TOTAL") {
    out.push({
      title: "Atención",
      source: "Vialidad Nacional",
      description: `Estado vialidad: ${vialidad}`,
      rawText:
        vialidad === "CORTE TOTAL"
          ? "Estado vialidad: restricción total de circulación"
          : "Estado vialidad: circulación restringida",
    });
  }

  return out;
}

function parseAlerts(scope: HTMLElement | null): AlertRaw[] {
  if (!scope) return [];
  const alerts: AlertRaw[] = [];

  for (const h5 of scope.querySelectorAll("h5")) {
    if (normalizeText(h5.textContent) !== "Atención") continue;

    const siblings = collectFollowingSiblings(h5, ["h5", "h3", "h2", "section"]);
    const paragraphs: HTMLElement[] = [];
    for (const el of siblings) {
      if (el.tagName.toLowerCase() === "p" && normalizeText(el.textContent)) paragraphs.push(el);
    }
    if (paragraphs.length === 0) continue;

    const groups = splitAlertParagraphGroups(paragraphs);

    for (const paragraphGroup of groups) {
      let source: string | undefined;
      let description: string | undefined;
      const detailParts: string[] = [];
      const rawParts: string[] = [];

      for (const p of paragraphGroup) {
        const full = normalizeText(p.textContent);
        if (!full) continue;
        rawParts.push(full);

        const informa = full.match(/^(.+?)\s+informa:\s*(.*)$/i);
        if (informa) {
          source = opt(informa[1]);
          const afterInforma = informa[2].trim();
          const strong = p.querySelector("strong");
          if (strong) {
            description = opt(normalizeText(strong.textContent));
            const ds = normalizeText(strong.textContent);
            let rest = normalizeText(afterInforma.replace(ds, "").trim());
            rest = rest.replace(/^[\s,.;:-]+/, "").trim();
            if (rest) detailParts.push(rest);
          } else if (afterInforma) {
            description = description ?? opt(afterInforma);
          }
          continue;
        }

        detailParts.push(full);
      }

      const rawText = rawParts.join(" ").replace(/\s+/g, " ").trim();
      const detailJoined = detailParts.length ? detailParts.join(" ").replace(/\s+/g, " ").trim() : undefined;

      if (rawText.length > 3) {
        alerts.push({
          source,
          title: "Atención",
          description,
          detail: opt(detailJoined),
          rawText,
        });
      }
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

/** Cristo Redentor / Pehuenche: bold en cabecera + `dl.weather__info-item`. */
function parseWeatherClassicStructure(section: HTMLElement): WeatherNowRaw | undefined {
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

/**
 * Agua Negra y variantes: listas `Temperatura: …`, `Condición: …` sin el bloque .header-weather clásico.
 */
function parseWeatherAlternateStructure(section: HTMLElement): WeatherNowRaw | undefined {
  const smnTime = section.querySelector("details.pi-tooltip time[datetime]");
  const providerNote = opt(smnTime?.getAttribute("datetime"));

  let temperatureC: number | undefined;
  let description: string | undefined;
  let wind: string | undefined;
  let sunrise: string | undefined;
  let sunset: string | undefined;
  let visibilityKm: number | undefined;
  let visibilityText: string | undefined;

  for (const dl of section.querySelectorAll("dl")) {
    for (const dt of dl.querySelectorAll("dt")) {
      if ((dt as HTMLElement).parentNode !== dl) continue;
      const label = normalizeText(dt.textContent)
        .replace(/:$/, "")
        .toLowerCase();
      const dd = dt.nextElementSibling as HTMLElement | null;
      if (!dd || dd.tagName.toLowerCase() !== "dd") continue;
      const val = normalizeText(dd.textContent);
      if (!val) continue;
      if (label.includes("temperatura")) {
        const t = parseTemperatureC(val);
        if (t != null) temperatureC = t;
      } else if (label.includes("condici")) {
        description = description ?? val;
      } else if (label.includes("viento")) {
        wind = opt(val);
      } else if (label.includes("visibilidad")) {
        const km = parseVisibilityKm(val);
        if (km != null) visibilityKm = km;
        else visibilityText = val;
      } else if (label.includes("salida del sol")) {
        sunrise = val;
      } else if (label.includes("puesta del sol")) {
        sunset = val;
      }
    }
  }

  const blob = normalizeText(section.textContent);
  if (temperatureC == null) {
    const tm = blob.match(/temperatura\s*:?\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*c/i);
    if (tm) {
      const n = Number(tm[1].replace(",", "."));
      if (Number.isFinite(n)) temperatureC = n;
    }
  }
  if (description == null) {
    const cm = blob.match(/condici[oó]n\s*:?\s*([^\n]+?)(?=\s*(?:viento|visibilidad|salida|puesta)|$)/i);
    if (cm) description = normalizeText(cm[1]);
  }
  if (wind == null) {
    const wm = blob.match(/viento\s*:?\s*([^\n]+)/i);
    if (wm) wind = normalizeText(wm[1]);
  }
  if (visibilityKm == null && visibilityText == null) {
    const vm = blob.match(/visibilidad\s*:?\s*([^\n]+)/i);
    if (vm) {
      const raw = normalizeText(vm[1]);
      const km = parseVisibilityKm(raw);
      if (km != null) visibilityKm = km;
      else visibilityText = raw;
    }
  }
  if (sunset == null) {
    const pm = blob.match(/puesta del sol\s*:?\s*([0-9]{1,2}:[0-9]{2})/i);
    if (pm) sunset = pm[1];
  }
  if (sunrise == null) {
    const sm = blob.match(/salida del sol\s*:?\s*([0-9]{1,2}:[0-9]{2})/i);
    if (sm) sunrise = sm[1];
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

function mergeWeatherNow(
  classic: WeatherNowRaw | undefined,
  alternate: WeatherNowRaw | undefined,
): WeatherNowRaw | undefined {
  if (!classic && !alternate) return undefined;
  const a = alternate ?? {};
  const c = classic ?? {};
  return {
    description: c.description ?? a.description,
    temperatureC: c.temperatureC ?? a.temperatureC,
    wind: c.wind ?? a.wind,
    visibilityKm: c.visibilityKm ?? a.visibilityKm,
    visibilityText: c.visibilityText ?? a.visibilityText,
    sunrise: c.sunrise ?? a.sunrise,
    sunset: c.sunset ?? a.sunset,
    providerNote: c.providerNote ?? a.providerNote,
  };
}

function parseCurrentWeather(section: HTMLElement | null): WeatherNowRaw | undefined {
  if (!section) return undefined;
  const classic = parseWeatherClassicStructure(section);
  const alternate = parseWeatherAlternateStructure(section);
  return mergeWeatherNow(classic, alternate);
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
  const alerts = [...parseAlerts(main), ...parseInlinePassStateAlerts(html)];

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
