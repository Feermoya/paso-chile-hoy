export interface PassAlert {
  text: string;
  date: string;
  url: string;
  passesmentioned: string[];
  alertType: "cierre" | "apertura" | "condicion" | "info";
}

const NITTER_MIRRORS = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.1d4.us",
  "https://nitter.kavin.rocks",
];

/**
 * Obtiene los últimos tweets de @PasoCRMza vía RSS de nitter.
 * Si todos los mirrors fallan, devuelve array vacío (nunca rompe la app).
 */
export async function getPassCRTweets(): Promise<PassAlert[]> {
  for (const mirror of NITTER_MIRRORS) {
    try {
      const res = await fetch(`${mirror}/PasoCRMza/rss`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PasoChileHoy/1.0)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const alerts = parseRSSToAlerts(xml);

      if (alerts.length > 0) return alerts;
    } catch {
      continue;
    }
  }

  return [];
}

function extractTitleFromItem(item: string): string | null {
  const cdata = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
  if (cdata?.[1]) return decodeXmlEntities(cdata[1].trim());

  const plain = item.match(/<title>([\s\S]*?)<\/title>/i);
  if (plain?.[1]) return decodeXmlEntities(plain[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());

  return null;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parseRSSToAlerts(xml: string): PassAlert[] {
  const alerts: PassAlert[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const text = extractTitleFromItem(item);
    if (!text) continue;

    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const alert: PassAlert = {
      text,
      url: linkMatch?.[1]?.trim() ?? "",
      date: dateMatch?.[1]?.trim() ?? "",
      passesmentioned: detectPassesMentioned(text),
      alertType: detectAlertType(text),
    };

    alerts.push(alert);
    if (alerts.length >= 5) break;
  }

  return alerts;
}

function detectPassesMentioned(text: string): string[] {
  const t = text.toLowerCase();
  const passes: string[] = [];
  if (t.includes("cristo redentor") || t.includes("sistema integrado") || t.includes("libertadores"))
    passes.push("cristo-redentor");
  if (t.includes("pehuenche")) passes.push("pehuenche");
  if (t.includes("puentecillas")) passes.push("puentecillas");
  if (t.includes("casa de piedra")) passes.push("casa-de-piedra");
  if (t.includes("agua negra")) passes.push("agua-negra");
  return passes;
}

function detectAlertType(text: string): PassAlert["alertType"] {
  const t = text.toLowerCase();
  if (
    t.includes("cerrado") ||
    t.includes("cierre") ||
    t.includes("suspensión") ||
    t.includes("suspension")
  )
    return "cierre";
  if (t.includes("habilitado") || t.includes("abierto") || t.includes("habilitación"))
    return "apertura";
  if (
    t.includes("precaución") ||
    t.includes("condicionado") ||
    t.includes("demoras") ||
    t.includes("solo livianos")
  )
    return "condicion";
  return "info";
}

/** Convierte URL de nitter (o mirror) a x.com manteniendo path. */
export function toXComUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `https://x.com${u.pathname}${u.search}`;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "https://x.com");
  }
}
