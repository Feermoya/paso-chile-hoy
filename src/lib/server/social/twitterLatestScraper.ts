import type {
  LatestTweetSnapshot,
  PassTwitterAlert,
  TweetSnapshotSource,
} from "@/lib/server/social/twitterTypes";
import { toXComUrl } from "@/lib/server/social/twitterUrl";
import { validateLatestTweetSnapshot } from "@/lib/server/social/twitterValidate";

const PROFILE_URL = "https://x.com/PasoCRMza";

const NITTER_MIRRORS = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.woodland.cafe",
  "https://nitter.esmailelbob.xyz",
  "https://nitter.moomoo.me",
  "https://nitter.tux.pizza",
  "https://nitter.1d4.us",
  "https://nitter.kavin.rocks",
];

const FETCH_TIMEOUT_MS = 18_000;
const RSS_TIMEOUT_MS = 14_000;

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
};

function logSource(source: TweetSnapshotSource): void {
  console.log(`[twitter] source=${source}`);
}

export async function fetchPasoCRMzaProfileHtml(): Promise<string | null> {
  try {
    const res = await fetch(PROFILE_URL, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseTwitterCreatedAt(raw: string | undefined): string {
  if (!raw?.trim()) return new Date().toISOString();
  const t = Date.parse(raw);
  if (Number.isFinite(t)) return new Date(t).toISOString();
  return raw.trim();
}

/**
 * Capa 1: texto embebido en HTML del perfil (hydration / JSON inline), sin segundo fetch.
 */
export function extractLatestTweetFromProfileHydration(html: string): LatestTweetSnapshot | null {
  let pos = 0;
  while (pos < html.length) {
    const sn = html.indexOf('"screen_name":"PasoCRMza"', pos);
    if (sn === -1) break;
    const slice = html.slice(sn, sn + 12_000);
    const full = slice.match(/"full_text":\s*"((?:\\.|[^"\\])*)"/);
    const restId = slice.match(/"rest_id":\s*"(\d{10,25})"/);
    const created = slice.match(/"created_at":\s*"([^"]+)"/);
    pos = sn + 20;

    if (!full?.[1] || !restId?.[1]) continue;
    const text = unescapeJsonString(full[1]).trim();
    if (text.length < 10) continue;

    const url = `https://x.com/PasoCRMza/status/${restId[1]}`;
    const snap: LatestTweetSnapshot = {
      text,
      url,
      date: parseTwitterCreatedAt(created?.[1]),
      source: "x-scrape",
    };
    if (validateLatestTweetSnapshot(snap)) return snap;
  }
  return null;
}

export function extractStatusIdsFromProfileHtml(html: string): string[] {
  const re = /\/PasoCRMza\/status\/(\d{10,25})/g;
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return [...ids];
}

export function pickNewestStatusId(ids: string[]): string | null {
  if (ids.length === 0) return null;
  try {
    return ids.reduce((a, b) => (BigInt(a) > BigInt(b) ? a : b));
  } catch {
    return ids.sort((a, b) => b.length - a.length || (a > b ? 1 : -1))[0] ?? null;
  }
}

export async function fetchStatusHtml(statusUrl: string): Promise<string | null> {
  try {
    const res = await fetch(statusUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function decodeHtmlAttrContent(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/**
 * Capa 2: meta tags / time en la página del status.
 */
export function extractTweetFromStatusHtml(
  html: string,
  statusUrl: string,
): LatestTweetSnapshot | null {
  const og =
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ??
    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i) ??
    html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/i);

  let text = og?.[1] ? decodeHtmlAttrContent(og[1]).trim() : "";

  const generic =
    /^the latest posts from @?pasocrmza/i.test(text) ||
    /^posts from @?pasocrmza/i.test(text) ||
    text.length < 10;

  if (generic) {
    const tw = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i);
    const t2 = tw?.[1] ? decodeHtmlAttrContent(tw[1]).trim() : "";
    if (t2.length >= 10 && !/^on x:/i.test(t2)) text = t2;
  }

  const timeMatch =
    html.match(/<time[^>]*datetime="([^"]+)"/i) ??
    html.match(/datetime="(\d{4}-\d{2}-\d{2}T[^"]+)"/i);

  const date = timeMatch?.[1]?.trim() ? parseTwitterCreatedAt(timeMatch[1]) : new Date().toISOString();

  if (!text || text.length < 10) return null;

  const snap: LatestTweetSnapshot = {
    text,
    url: statusUrl,
    date,
    source: "status-scrape",
  };
  return validateLatestTweetSnapshot(snap) ? snap : null;
}

function detectPassesMentioned(t: string): string[] {
  const x = t.toLowerCase();
  const passes: string[] = [];
  if (x.includes("cristo redentor") || x.includes("sistema integrado") || x.includes("libertadores"))
    passes.push("cristo-redentor");
  if (x.includes("pehuenche")) passes.push("pehuenche");
  if (x.includes("puentecillas")) passes.push("puentecillas");
  if (x.includes("casa de piedra")) passes.push("casa-de-piedra");
  if (x.includes("agua negra")) passes.push("agua-negra");
  return passes;
}

function detectAlertType(text: string): PassTwitterAlert["alertType"] {
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

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractTitleFromRssItem(item: string): string | null {
  const cdata = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
  if (cdata?.[1]) return decodeXmlEntities(cdata[1].trim());

  const plain = item.match(/<title>([\s\S]*?)<\/title>/i);
  if (plain?.[1]) return decodeXmlEntities(plain[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());

  return null;
}

async function fetchPasoCRMzaRssXml(): Promise<string | null> {
  const init: RequestInit = {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
  };
  for (const mirror of NITTER_MIRRORS) {
    try {
      const res = await fetch(`${mirror}/PasoCRMza/rss`, init);
      if (!res.ok) continue;
      const xml = await res.text();
      if (xml && /<item[\s>]/i.test(xml)) return xml;
    } catch {
      continue;
    }
  }
  return null;
}

function parseRssToPassAlerts(xml: string): PassTwitterAlert[] {
  const alerts: PassTwitterAlert[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const text = extractTitleFromRssItem(item);
    if (!text) continue;

    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    alerts.push({
      text,
      url: linkMatch?.[1]?.trim() ?? "",
      date: dateMatch?.[1]?.trim() ?? "",
      passesmentioned: detectPassesMentioned(text),
      alertType: detectAlertType(text),
    });
    if (alerts.length >= 8) break;
  }

  return alerts;
}

function firstRssItemToSnapshot(xml: string, source: TweetSnapshotSource): LatestTweetSnapshot | null {
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;
  const inner = itemMatch[1];
  const text = extractTitleFromRssItem(inner);
  if (!text || text.trim().length < 10) return null;
  const linkMatch = inner.match(/<link>([\s\S]*?)<\/link>/i);
  const dateMatch = inner.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
  const urlRaw = linkMatch?.[1]?.trim() ?? "";
  const snap: LatestTweetSnapshot = {
    text: text.trim(),
    url: toXComUrl(urlRaw),
    date: dateMatch?.[1]?.trim() || new Date().toISOString(),
    source,
  };
  return validateLatestTweetSnapshot(snap) ? snap : null;
}

export interface TwitterScrapeResult {
  latestTweet: LatestTweetSnapshot | null;
  passAlerts: PassTwitterAlert[];
}

/**
 * Orden: hydration en perfil → página de status (ID más reciente en HTML) → RSS Nitter.
 */
export async function fetchLatestTweetSnapshot(): Promise<TwitterScrapeResult> {
  const profileHtml = await fetchPasoCRMzaProfileHtml();
  if (!profileHtml) {
    console.log("[twitter] profile fetch failed");
  } else {
    const fromHydration = extractLatestTweetFromProfileHydration(profileHtml);
    if (fromHydration) {
      logSource("x-scrape");
      console.log("[twitter] latest tweet resolved");
      const passAlerts = passAlertsFromSnapshot(fromHydration);
      return { latestTweet: fromHydration, passAlerts };
    }

    const ids = extractStatusIdsFromProfileHtml(profileHtml);
    const newest = pickNewestStatusId(ids);
    if (newest) {
      const statusUrl = `https://x.com/PasoCRMza/status/${newest}`;
      const statusHtml = await fetchStatusHtml(statusUrl);
      if (statusHtml) {
        const fromStatus = extractTweetFromStatusHtml(statusHtml, statusUrl);
        if (fromStatus) {
          logSource("status-scrape");
          console.log("[twitter] latest tweet resolved");
          return {
            latestTweet: fromStatus,
            passAlerts: passAlertsFromSnapshot(fromStatus),
          };
        }
      }
    }
  }

  const xml = await fetchPasoCRMzaRssXml();
  if (!xml) {
    console.log("[twitter] latest tweet not found");
    return { latestTweet: null, passAlerts: [] };
  }

  logSource("nitter-rss");
  const passAlerts = parseRssToPassAlerts(xml);
  const latestTweet = firstRssItemToSnapshot(xml, "nitter-rss");
  if (latestTweet) {
    console.log("[twitter] latest tweet resolved");
  } else {
    console.log("[twitter] latest tweet not found");
  }
  return { latestTweet, passAlerts };
}

function passAlertsFromSnapshot(s: LatestTweetSnapshot): PassTwitterAlert[] {
  return [
    {
      text: s.text,
      date: s.date,
      url: s.url,
      passesmentioned: detectPassesMentioned(s.text),
      alertType: detectAlertType(s.text),
    },
  ];
}
