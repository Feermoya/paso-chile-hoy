/**
 * Estado operativo del Paso Agua Negra desde el sitio oficial de San Juan.
 * https://aguanegra.sanjuan.gob.ar/estado-del-paso
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
  scrapedAt: string;
  source: "aguanegra.sanjuan.gob.ar";
}

export async function scrapeAguaNegraStatus(): Promise<AguaNegraData> {
  const url = "https://aguanegra.sanjuan.gob.ar/estado-del-paso";
  const scrapedAt = new Date().toISOString();
  const empty: AguaNegraData = {
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
    scrapedAt,
    source: "aguanegra.sanjuan.gob.ar",
  };

  console.log("[aguanegra] Scraping estado desde:", url);

  try {
    const res = await fetch(url, {
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
      console.error(`[aguanegra] HTTP ${res.status} — usando fallback`);
      return empty;
    }

    const html = await res.text();

    let rawStatus: AguaNegraData["rawStatus"] = "SIN_DATOS";
    let statusDetail: string | null = null;

    const statusCandidates: Array<{
      regex: RegExp;
      status: AguaNegraData["rawStatus"];
      detail: string;
    }> = [
      { regex: /cerrado\s+para\s+egreso/i, status: "CERRADO", detail: "Cerrado para egreso" },
      { regex: /abierto\s+para\s+egreso/i, status: "ABIERTO", detail: "Abierto para egreso" },
      {
        regex: /condicionado\s+para\s+egreso/i,
        status: "CONDICIONADO",
        detail: "Condicionado para egreso",
      },
      { regex: /paso\s+cerrado/i, status: "CERRADO", detail: "Paso cerrado" },
      { regex: /paso\s+abierto/i, status: "ABIERTO", detail: "Paso abierto" },
      { regex: />Cerrado</i, status: "CERRADO", detail: "Cerrado" },
      { regex: />Abierto</i, status: "ABIERTO", detail: "Abierto" },
      { regex: />Condicionado</i, status: "CONDICIONADO", detail: "Condicionado" },
    ];

    for (const { regex, status, detail } of statusCandidates) {
      if (regex.test(html)) {
        rawStatus = status;
        statusDetail = detail;
        break;
      }
    }

    let statusUpdatedAt: string | null = null;
    const datePattern = /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\s*[•·]\s*(\d{2}:\d{2})\s*hs/i;
    const todayPattern = /Hoy[,\s]+(\d{2}:\d{2})\s*hs/i;
    const dateMatch = html.match(datePattern);
    const todayMatch = html.match(todayPattern);
    if (dateMatch) {
      statusUpdatedAt = `${dateMatch[1]} • ${dateMatch[2]} hs`;
    } else if (todayMatch) {
      statusUpdatedAt = `Hoy, ${todayMatch[1]} hs`;
    }

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

    let vialidadRuta: string | null = null;
    let vialidadEstado: string | null = null;
    let vialidadObs: string | null = null;

    const rnMatch = html.match(/RN\s+(\d+)/i);
    if (rnMatch) vialidadRuta = `RN ${rnMatch[1]}`;

    if (/\bHabilitada\b/i.test(html)) vialidadEstado = "HABILITADA";
    else if (/\bCortada\b/i.test(html)) vialidadEstado = "CORTE TOTAL";
    else if (/\bRestringida\b/i.test(html)) vialidadEstado = "RESTRINGIDA";

    const obsPatterns = [/Transitable[^.<]*[.<]/i, /Sin restricciones[^.<]*[.<]/i];
    for (const p of obsPatterns) {
      const m = html.match(p);
      if (m) {
        vialidadObs = m[0].replace(/[.<]$/, "").trim();
        break;
      }
    }

    let restriccionPasajeros: string | null = null;
    let restriccionVelocidad: string | null = null;

    const pasMatch = html.match(/Veh[ií]culos[^<\n]{0,60}/i);
    if (pasMatch) restriccionPasajeros = pasMatch[0].trim();

    const velMatch = html.match(/Velocidad\s*\n?\s*([a-záéíóúñ\s]+)/i);
    if (velMatch) restriccionVelocidad = velMatch[1].trim();

    console.log(
      `[aguanegra] ✅ rawStatus=${rawStatus} | schedule=${scheduleNormalized} | updatedAt=${statusUpdatedAt}`,
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
      scrapedAt,
      source: "aguanegra.sanjuan.gob.ar",
    };
  } catch (err) {
    console.error("[aguanegra] Error en scraping:", err);
    return empty;
  }
}
