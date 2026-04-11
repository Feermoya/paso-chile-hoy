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
  /** Error de red o estado no interpretable en HTML. */
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
    scrapedAt,
    source: "aguanegra.sanjuan.gob.ar",
    scrapeError: null,
  };
}

/**
 * El sitio de San Juan usa **HABILITADO** y “Tránsito normal” en la tarjeta principal,
 * no la palabra “ABIERTO”. Si no se detecta eso primero, un “cerrado para egreso” suelto
 * en otra parte del HTML (accesibilidad, texto legal, otro bloque) puede dar CERRADO falso.
 *
 * Orden: señales claras de apertura (HABILITADO / tránsito normal) → etiquetas CERRADO/CONDICIONADO/ABIERTO
 * → contexto “estado” → frases operativas (positivas antes que cerrado para egreso).
 */
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
        scrapeError: `Error de red (HTTP ${res.status}) al leer la fuente oficial`,
      };
    }

    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[aguanegra] Error en fetch:", err);
    return {
      ...empty,
      scrapeError: `Error de red: ${msg}`,
    };
  }

  let rawStatus: AguaNegraData["rawStatus"] = "SIN_DATOS";
  let statusDetail: string | null = null;

  /** En el JSON/vista usamos ABIERTO (misma convención que Gendarmería e inferPassStatus). */
  const openFromSanJuan = (detail: string) => {
    rawStatus = "ABIERTO";
    statusDetail = detail;
  };

  // 1) Tarjeta principal del sitio: HABILITADO / Tránsito normal (no usar “habilitado” suelto: aparece en clases CSS, etc.).
  if (
    />[\s]*HABILITADO[\s]*</i.test(html) ||
    /\bHABILITADO\b/i.test(html) ||
    /"estado"\s*:\s*"HABILITADO"/i.test(html)
  ) {
    openFromSanJuan("Habilitado");
  } else if (/tr[aá]nsito\s+normal/i.test(html)) {
    openFromSanJuan("Tránsito normal");
  }

  const exactTagPatterns: Array<{
    regex: RegExp;
    status: AguaNegraData["rawStatus"];
    detail: string;
  }> = [
    { regex: />\s*HABILITADO\s*</i, status: "ABIERTO", detail: "Habilitado" },
    { regex: />\s*ABIERTO\s*</i, status: "ABIERTO", detail: "ABIERTO" },
    { regex: />\s*CONDICIONADO\s*</i, status: "CONDICIONADO", detail: "CONDICIONADO" },
    { regex: />\s*CERRADO\s*</i, status: "CERRADO", detail: "CERRADO" },
  ];

  if (rawStatus === "SIN_DATOS") {
    for (const { regex, status, detail } of exactTagPatterns) {
      if (regex.test(html)) {
        rawStatus = status;
        statusDetail = detail;
        break;
      }
    }
  }

  if (rawStatus === "SIN_DATOS") {
    const estadoCtx =
      /estado[^a-záéíóúñ]{0,120}(HABILITADO|ABIERTO|CERRADO|CONDICIONADO)\b/i.exec(html);
    if (estadoCtx) {
      const w = estadoCtx[1].toUpperCase();
      if (w === "HABILITADO") {
        openFromSanJuan("Habilitado");
      } else if (w === "ABIERTO" || w === "CERRADO" || w === "CONDICIONADO") {
        rawStatus = w;
        statusDetail = w;
      }
    }
  }

  if (rawStatus === "SIN_DATOS") {
    const phrasePatterns: Array<{
      regex: RegExp;
      status: AguaNegraData["rawStatus"];
      detail: string;
    }> = [
      { regex: /habilitado\s+para\s+egreso/i, status: "ABIERTO", detail: "Habilitado para egreso" },
      { regex: /abierto\s+para\s+egreso/i, status: "ABIERTO", detail: "Abierto para egreso" },
      { regex: /habilitado\s+para\s+ingreso/i, status: "ABIERTO", detail: "Habilitado para ingreso" },
      {
        regex: /condicionado\s+para\s+egreso/i,
        status: "CONDICIONADO",
        detail: "Condicionado para egreso",
      },
      { regex: /paso\s+abierto/i, status: "ABIERTO", detail: "Paso abierto" },
      { regex: /cerrado\s+para\s+egreso/i, status: "CERRADO", detail: "Cerrado para egreso" },
      { regex: /cerrado\s+para\s+ingreso/i, status: "CERRADO", detail: "Cerrado para ingreso" },
      { regex: /paso\s+cerrado/i, status: "CERRADO", detail: "Paso cerrado" },
    ];

    for (const { regex, status, detail } of phrasePatterns) {
      if (regex.test(html)) {
        rawStatus = status;
        statusDetail = detail;
        break;
      }
    }
  }

  let scrapeError: string | null = null;
  if (rawStatus === "SIN_DATOS") {
    scrapeError =
      "No se pudo determinar el estado desde aguanegra.sanjuan.gob.ar (HTML no reconocido)";
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

  const htmlAlertsCandidates: string[] = [];
  if (statusDetail?.trim()) htmlAlertsCandidates.push(statusDetail.trim());
  if (scheduleDays?.trim()) htmlAlertsCandidates.push(`Días de apertura: ${scheduleDays.trim()}`);
  if (restriccionPasajeros?.trim()) htmlAlertsCandidates.push(restriccionPasajeros.trim());
  if (restriccionVelocidad?.trim()) {
    htmlAlertsCandidates.push(`Velocidad ${restriccionVelocidad.trim()}`);
  }

  console.log(
    `[aguanegra] ✅ rawStatus=${rawStatus} | schedule=${scheduleNormalized} | updatedAt=${statusUpdatedAt} | err=${scrapeError ?? "—"}`,
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
    scrapeError,
  };
}
