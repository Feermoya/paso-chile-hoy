/**
 * Estado operativo del Paso Agua Negra desde el sitio oficial de San Juan.
 * https://aguanegra.sanjuan.gob.ar/estado-del-paso
 *
 * El estado operativo debe leerse del bloque **Estado del Paso**, no de palabras sueltas
 * en vialidad (“Habilitada”), clima ni pie de página. El clima del HTML estático no se usa;
 * el snapshot sigue armando clima con wttr.in en snapshotService.
 */

export interface AguaNegraData {
  rawStatus: "ABIERTO" | "CERRADO" | "CONDICIONADO" | "SIN_DATOS";
  statusDetail: string | null;
  statusUpdatedAt: string | null;
  scheduleText: string | null;
  scheduleNormalized: string | null;
  scheduleDays: string | null;
  vialidadRuta: string | null;
  vialidadEstado: string | null;
  vialidadObs: string | null;
  restriccionPasajeros: string | null;
  restriccionVelocidad: string | null;
  /** Altitud en msnm si aparece en la página (p. ej. Alt. 4.780 msnm). */
  altitudeMFromPage: number | null;
  scrapedAt: string;
  source: "aguanegra.sanjuan.gob.ar";
  scrapeError?: string | null;
}

const URL_SJ = "https://aguanegra.sanjuan.gob.ar/estado-del-paso";

function emptyData(scrapedAt: string): AguaNegraData {
  return {
    rawStatus: "SIN_DATOS",
    statusDetail: null,
    statusUpdatedAt: null,
    scheduleText: null,
    scheduleNormalized: null,
    scheduleDays: null,
    vialidadRuta: null,
    vialidadEstado: null,
    vialidadObs: null,
    restriccionPasajeros: null,
    restriccionVelocidad: null,
    altitudeMFromPage: null,
    scrapedAt,
    source: "aguanegra.sanjuan.gob.ar",
    scrapeError: null,
  };
}

/** Recorte HTML de la tarjeta “Estado del Paso” hasta el siguiente bloque grande (evita vialidad/clima). */
function extractEstadoDelPasoCard(html: string): string {
  const m = html.match(/Estado\s+del\s+Paso/i);
  if (!m || m.index === undefined) return "";
  const tail = html.slice(m.index);
  const endRel = tail.search(
    /\bHorarios?\s+de\s+egreso\b|\bClima\s+en\s+el\b|\bVialidad\b|\bRN\s+\d{2,4}\b/i,
  );
  const max = 4500;
  const len = endRel === -1 ? max : Math.min(endRel + 80, max);
  return tail.slice(0, len);
}

/** HTML para timestamps: cortar antes de “Recomendaciones” (fecha al pie no es la del estado). */
function htmlForStatusTimestamp(html: string): string {
  const idx = html.search(/\brecomendaciones\b/i);
  return idx === -1 ? html : html.slice(0, idx);
}

function inferFromEstadoCard(card: string): { raw: AguaNegraData["rawStatus"]; detail: string } | null {
  const c = card;
  if (!c.trim()) return null;

  if (/Cerrado\s+para\s+egreso/i.test(c)) {
    return { raw: "CERRADO", detail: "Cerrado para egreso" };
  }
  if (/Cerrado\s+para\s+ingreso/i.test(c)) {
    return { raw: "CERRADO", detail: "Cerrado para ingreso" };
  }
  if (/Condicionado\s+para\s+egreso/i.test(c)) {
    return { raw: "CONDICIONADO", detail: "Condicionado para egreso" };
  }
  if (/Habilitado\s+para\s+egreso/i.test(c)) {
    return { raw: "ABIERTO", detail: "Habilitado para egreso" };
  }
  if (/Abierto\s+para\s+egreso/i.test(c)) {
    return { raw: "ABIERTO", detail: "Abierto para egreso" };
  }

  if (/>\s*CERRADO\s*</i.test(c)) {
    const line = c.match(/Cerrado\s+para\s+[^<\n]{3,80}/i);
    return { raw: "CERRADO", detail: line?.[0]?.trim() ?? "CERRADO" };
  }
  if (/>\s*CONDICIONADO\s*</i.test(c)) {
    return { raw: "CONDICIONADO", detail: "CONDICIONADO" };
  }
  if (/>\s*HABILITADO\s*</i.test(c) || />\s*ABIERTO\s*</i.test(c)) {
    if (/tr[aá]nsito\s+normal/i.test(c)) {
      return { raw: "ABIERTO", detail: "Tránsito normal" };
    }
    return { raw: "ABIERTO", detail: "Habilitado" };
  }

  if (/\bCerrado\b/i.test(c)) {
    const line = c.match(/Cerrado\s+para\s+[^<\n]{3,80}/i);
    return { raw: "CERRADO", detail: line?.[0]?.trim() ?? "Cerrado" };
  }
  if (/\bCondicionado\b/i.test(c)) {
    return { raw: "CONDICIONADO", detail: "Condicionado" };
  }
  if (/\bHabilitado\b/i.test(c) && !/\b(inhabilitado|deshabilitado)\b/i.test(c)) {
    if (/tr[aá]nsito\s+normal/i.test(c)) {
      return { raw: "ABIERTO", detail: "Tránsito normal" };
    }
    return { raw: "ABIERTO", detail: "Habilitado" };
  }
  if (/\bAbierto\b/i.test(c)) {
    return { raw: "ABIERTO", detail: "Abierto" };
  }

  return null;
}

/** Mini-header / líneas tipo “Abierto – para egreso” o Cerró / Abrió hs. */
function inferFromFallbacks(html: string): { raw: AguaNegraData["rawStatus"]; detail: string } | null {
  const mini = html.match(
    /\b(Abierto|Cerrado|Habilitado|Condicionado)\b\s*[-–]\s*para\s*(ingreso|egreso|todo\s+tipo(?:\s+de\s+tr[aá]nsito)?)/i,
  );
  if (mini) {
    const w = mini[1].toLowerCase();
    const leg = `${mini[1]} para ${mini[2].trim()}`;
    if (w === "cerrado") return { raw: "CERRADO", detail: leg };
    if (w === "condicionado") return { raw: "CONDICIONADO", detail: leg };
    return { raw: "ABIERTO", detail: leg };
  }

  const cerró = html.match(/Cerró\s+(\d{2}:\d{2})\s*hs/i);
  if (cerró) {
    return { raw: "CERRADO", detail: `Cerró ${cerró[1]} hs` };
  }
  const abrió = html.match(/Abrió\s+(\d{2}:\d{2})\s*hs/i);
  if (abrió) {
    return { raw: "ABIERTO", detail: `Abrió ${abrió[1]} hs` };
  }

  return null;
}

function parseStatusUpdatedAt(estadoCard: string, htmlSafe: string): string | null {
  const datePattern = /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\s*[•·]\s*(\d{2}:\d{2})\s*hs/i;
  const inCard = estadoCard.match(datePattern);
  if (inCard) {
    return `${inCard[1]} • ${inCard[2]} hs`;
  }
  const inBody = htmlSafe.match(datePattern);
  if (inBody) {
    return `${inBody[1]} • ${inBody[2]} hs`;
  }
  const todayPattern = /Actualizado:\s*Hoy[,\s]+(\d{2}:\d{2})\s*hs/i;
  const todayAlt = /Hoy[,\s]+(\d{2}:\d{2})\s*hs/i;
  const t1 = htmlSafe.match(todayPattern);
  if (t1) return `Hoy, ${t1[1]} hs`;
  const t2 = htmlSafe.match(todayAlt);
  if (t2) return `Hoy, ${t2[1]} hs`;
  return null;
}

function parseAltitudeM(html: string): number | null {
  const m = html.match(/Alt\.?\s*([\d.,]+)\s*msnm/i);
  if (!m) return null;
  const t = m[1].trim();
  const parts = t.split(".");
  let s: string;
  if (parts.length === 2 && parts[1].length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    s = `${parts[0]}${parts[1]}`;
  } else {
    s = t.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 1000 || n > 7000) return null;
  return Math.round(n);
}

function parseVialidadNearRn(html: string): {
  vialidadRuta: string | null;
  vialidadEstado: string | null;
  vialidadObs: string | null;
} {
  const rn = html.match(/\bRN\s*(\d{2,4})\b/i);
  if (!rn || rn.index === undefined) {
    return { vialidadRuta: null, vialidadEstado: null, vialidadObs: null };
  }
  const rutaNum = rn[1];
  const chunk = html.slice(rn.index, rn.index + 520);
  let vialidadEstado: string | null = null;
  if (/\bHabilitada\b/i.test(chunk)) vialidadEstado = "HABILITADA";
  else if (/\bCortada\b/i.test(chunk)) vialidadEstado = "CORTE TOTAL";
  else if (/\bRestringida\b/i.test(chunk)) vialidadEstado = "RESTRINGIDA";
  else if (/\bCerrada\b/i.test(chunk)) vialidadEstado = "CERRADA";

  let vialidadObs: string | null = null;
  const trans = chunk.match(/Transitable[^.<\n]{0,120}[.<\n]/i);
  if (trans) {
    vialidadObs = trans[0].replace(/[.<\n]$/, "").trim();
  }

  return {
    vialidadRuta: `RN ${rutaNum}`,
    vialidadEstado,
    vialidadObs,
  };
}

export async function scrapeAguaNegraStatus(): Promise<AguaNegraData> {
  const scrapedAt = new Date().toISOString();
  const empty = emptyData(scrapedAt);

  console.log("[aguanegra] Scraping estado desde:", URL_SJ);

  let html: string;
  try {
    const res = await fetch(URL_SJ, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[aguanegra] HTTP ${res.status}`);
      return {
        ...empty,
        scrapeError: `Error al conectar con aguanegra.sanjuan.gob.ar: HTTP ${res.status}`,
      };
    }

    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[aguanegra] Error en fetch:", err);
    return {
      ...empty,
      scrapeError: `Error al conectar con aguanegra.sanjuan.gob.ar: ${msg}`,
    };
  }

  const estadoCard = extractEstadoDelPasoCard(html);
  const htmlSafeTs = htmlForStatusTimestamp(html);

  let rawStatus: AguaNegraData["rawStatus"] = "SIN_DATOS";
  let statusDetail: string | null = null;

  const fromCard = inferFromEstadoCard(estadoCard);
  if (fromCard) {
    rawStatus = fromCard.raw;
    statusDetail = fromCard.detail;
  } else {
    const fb = inferFromFallbacks(html);
    if (fb) {
      rawStatus = fb.raw;
      statusDetail = fb.detail;
    }
  }

  let scrapeError: string | null = null;
  if (rawStatus === "SIN_DATOS") {
    scrapeError =
      "No se pudo determinar el estado desde aguanegra.sanjuan.gob.ar (HTML no reconocido)";
  }

  const statusUpdatedAt = parseStatusUpdatedAt(estadoCard, htmlSafeTs);

  let scheduleText: string | null = null;
  let scheduleNormalized: string | null = null;
  const scheduleMatch = html.match(/(\d{2}:\d{2})\s+a\s+(\d{2}:\d{2})\s+hs/i);
  if (scheduleMatch) {
    scheduleText = `${scheduleMatch[1]} a ${scheduleMatch[2]} hs`;
    scheduleNormalized = `${scheduleMatch[1]}-${scheduleMatch[2]}`;
  }

  let scheduleDays: string | null = null;
  const daysMatch = html.match(/D[ií]as de apertura[^:]*:\s*([^<\n]+)/i);
  if (daysMatch) scheduleDays = daysMatch[1].trim();

  const { vialidadRuta, vialidadEstado, vialidadObs } = parseVialidadNearRn(html);

  let restriccionPasajeros: string | null = null;
  let restriccionVelocidad: string | null = null;

  const pasMatch = html.match(/Veh[ií]culos[^<\n]{0,60}/i);
  if (pasMatch) restriccionPasajeros = pasMatch[0].trim();

  const velMatch = html.match(/Velocidad\s*\n?\s*([a-záéíóúñ\s]+)/i);
  if (velMatch) restriccionVelocidad = velMatch[1].trim();

  const altitudeMFromPage = parseAltitudeM(html);

  console.log(
    `[aguanegra] ✅ rawStatus=${rawStatus} | detail=${statusDetail ?? "—"} | schedule=${scheduleNormalized} | updatedAt=${statusUpdatedAt ?? "—"} | err=${scrapeError ?? "—"}`,
  );

  return {
    rawStatus,
    statusDetail,
    statusUpdatedAt,
    scheduleText,
    scheduleNormalized,
    scheduleDays,
    vialidadRuta,
    vialidadEstado,
    vialidadObs,
    restriccionPasajeros,
    restriccionVelocidad,
    altitudeMFromPage,
    scrapedAt,
    source: "aguanegra.sanjuan.gob.ar",
    scrapeError,
  };
}
