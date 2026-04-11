import type { PassLatestTweet, PassTweetSentiment } from "@/types/pass-view";

export interface PassAlert {
  text: string;
  date: string;
  url: string;
  passesmentioned: string[];
  alertType: "cierre" | "apertura" | "condicion" | "info";
}

/** Instancias Nitter públicas (rotan/disponibilidad variable). */
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

const RSS_TIMEOUT_MS = 12_000;

/** Bearer de la API de X (Twitter) v2 — opcional; sin esto el RSS vía Nitter suele fallar. */
function twitterBearerToken(): string | null {
  return (
    process.env.TWITTER_BEARER_TOKEN?.trim() ||
    process.env.X_BEARER_TOKEN?.trim() ||
    null
  );
}

let twitterApiSnapshotPromise: Promise<{
  tweets: PassAlert[];
  latestTweet: PassLatestTweet | null;
} | null> | null = null;

/**
 * Timeline real @PasoCRMza (sin Nitter). Requiere app en developer.x.com con lectura permitida.
 */
async function fetchTwitterApiSnapshotInner(): Promise<{
  tweets: PassAlert[];
  latestTweet: PassLatestTweet | null;
} | null> {
  const token = twitterBearerToken();
  if (!token) return null;

  try {
    const userRes = await fetch(
      "https://api.twitter.com/2/users/by/username/PasoCRMza?user.fields=id",
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!userRes.ok) {
      console.warn("[twitter] API usuario HTTP", userRes.status);
      return null;
    }
    const userJson = (await userRes.json()) as { data?: { id: string } };
    const uid = userJson.data?.id;
    if (!uid) return null;

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${uid}/tweets?max_results=10&exclude=retweets&tweet.fields=created_at`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!tweetsRes.ok) {
      console.warn("[twitter] API timeline HTTP", tweetsRes.status);
      return null;
    }
    const tl = (await tweetsRes.json()) as {
      data?: Array<{ id: string; text: string; created_at: string }>;
    };
    const items = tl.data ?? [];
    if (items.length === 0) return null;

    const tweets: PassAlert[] = items.slice(0, 10).map((tw) => ({
      text: tw.text,
      date: tw.created_at,
      url: `https://x.com/PasoCRMza/status/${tw.id}`,
      passesmentioned: detectPassesMentioned(tw.text),
      alertType: detectAlertType(tw.text),
    }));

    const first = items[0];
    const latestTweet: PassLatestTweet = {
      text: first.text,
      date: first.created_at,
      url: `https://x.com/PasoCRMza/status/${first.id}`,
      sentiment: tweetSentiment(first.text),
    };

    return { tweets, latestTweet };
  } catch (e) {
    console.warn("[twitter] API error:", e);
    return null;
  }
}

async function getTwitterApiSnapshotCached(): Promise<{
  tweets: PassAlert[];
  latestTweet: PassLatestTweet | null;
} | null> {
  if (!twitterBearerToken()) return null;
  if (!twitterApiSnapshotPromise) {
    twitterApiSnapshotPromise = fetchTwitterApiSnapshotInner();
  }
  return twitterApiSnapshotPromise;
}

/**
 * Para la home SSR: último post real — primero API de X (Bearer), si no RSS Nitter.
 */
export async function fetchHomeLatestTweetLive(): Promise<PassLatestTweet | null> {
  const snap = await getTwitterApiSnapshotCached();
  const fromApi = snap?.latestTweet;
  if (fromApi && fromApi.text.trim().length >= 10) return fromApi;

  const xml = await fetchPasoCRMzaRssXml();
  if (!xml) return null;
  const tweets = parseRSSToAlerts(xml);
  const fromFirstItem = parseFirstRssItemToTweet(xml);
  return resolveHomeLatestTweet({ latestTweet: fromFirstItem, tweets });
}

function pickFirstRelevantFromAlerts(alerts: PassAlert[], slug: string): PassLatestTweet | null {
  const keywords = SLUG_KEYWORDS[slug] ?? [];
  for (const a of alerts) {
    const textLower = a.text.toLowerCase();
    const relevant =
      keywords.some((k) => textLower.includes(k)) ||
      textLower.includes("habilitado") ||
      textLower.includes("cerrado");
    if (relevant) return alertToLatestTweet(a);
  }
  return null;
}

const RSS_FETCH_INIT: RequestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
};

/**
 * Un solo fetch al primer mirror que responda con RSS válido (reduce fallos y carga doble).
 */
async function fetchPasoCRMzaRssXml(): Promise<string | null> {
  for (const mirror of NITTER_MIRRORS) {
    try {
      const res = await fetch(`${mirror}/PasoCRMza/rss`, RSS_FETCH_INIT);
      if (!res.ok) continue;
      const xml = await res.text();
      if (xml && /<item[\s>]/i.test(xml)) return xml;
    } catch {
      continue;
    }
  }
  return null;
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

const SLUG_KEYWORDS: Record<string, string[]> = {
  "cristo-redentor": [
    "cristo redentor",
    "rn7",
    "rn 7",
    "sistema integrado",
    "tunel",
    "tunnel",
    "libertadores",
  ],
  pehuenche: ["pehuenche", "rn145", "rn 145"],
  "agua-negra": ["agua negra", "rn150", "rn 150"],
};

function tweetSentiment(text: string): PassTweetSentiment {
  const t = text.toLowerCase();
  if (t.includes("habilitado") || t.includes("abierto") || t.includes("habilitación") || t.includes("habilitacion"))
    return "habilitado";
  if (t.includes("cerrado") || t.includes("cierre") || t.includes("suspensión") || t.includes("suspension"))
    return "cerrado";
  if (t.includes("condicionado") || t.includes("precaución") || t.includes("precaucion") || t.includes("demoras"))
    return "condicionado";
  return "info";
}

function alertToLatestTweet(a: PassAlert): PassLatestTweet {
  return {
    text: a.text,
    date: a.date,
    url: toXComUrl(a.url),
    sentiment: tweetSentiment(a.text),
  };
}

/**
 * Elige tweet para la home: prioriza `latestTweet` del JSON; si falta, el primer ítem de `tweets` con texto válido.
 */
export function resolveHomeLatestTweet(input: {
  latestTweet?: PassLatestTweet | null;
  tweets?: PassAlert[];
}): PassLatestTweet | null {
  const lt = input.latestTweet;
  if (lt && typeof lt.text === "string" && lt.text.trim().length >= 10) return lt;

  const alerts = input.tweets ?? [];
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    if (a?.text && typeof a.text === "string" && a.text.trim().length >= 10) {
      return alertToLatestTweet(a);
    }
  }
  return null;
}

function parseFirstRssItemToTweet(xml: string): PassLatestTweet | null {
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;
  const itemInner = itemMatch[1];
  const text = extractTitleFromItem(itemInner);
  if (!text || text.length < 10) return null;
  const linkMatch = itemInner.match(/<link>([\s\S]*?)<\/link>/i);
  const dateMatch = itemInner.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
  const url = linkMatch?.[1]?.trim() ?? "";
  const date = dateMatch?.[1]?.trim() ?? "";
  return {
    text,
    date,
    url: toXComUrl(url),
    sentiment: tweetSentiment(text),
  };
}

function pickFirstRelevantTweet(xml: string, slug: string): PassLatestTweet | null {
  const keywords = SLUG_KEYWORDS[slug] ?? [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemInner = match[1];
    const text = extractTitleFromItem(itemInner);
    if (!text) continue;
    const textLower = text.toLowerCase();
    const relevant =
      keywords.some((k) => textLower.includes(k)) ||
      textLower.includes("habilitado") ||
      textLower.includes("cerrado");
    if (!relevant) continue;

    const linkMatch = itemInner.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = itemInner.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const url = linkMatch?.[1]?.trim() ?? "";
    const date = dateMatch?.[1]?.trim() ?? "";

    return {
      text,
      date,
      url: toXComUrl(url),
      sentiment: tweetSentiment(text),
    };
  }
  return null;
}

/**
 * Para `tweets.json`: prioriza API de X si hay Bearer; si no, RSS Nitter.
 */
export async function fetchTweetsSnapshotForScrape(): Promise<{
  tweets: PassAlert[];
  latestTweet: PassLatestTweet | null;
}> {
  const api = await getTwitterApiSnapshotCached();
  if (api?.latestTweet && api.latestTweet.text.trim().length >= 10) {
    return api;
  }

  const xml = await fetchPasoCRMzaRssXml();
  if (!xml) return { tweets: [], latestTweet: null };

  const tweets = parseRSSToAlerts(xml);
  const fromFirstItem = parseFirstRssItemToTweet(xml);
  const latestTweet = resolveHomeLatestTweet({ latestTweet: fromFirstItem, tweets });

  return { tweets, latestTweet };
}

/**
 * Primer tweet de @PasoCRMza relevante para el paso: API si hay Bearer, si no RSS.
 */
export async function getLatestPassTweet(slug: string): Promise<PassLatestTweet | null> {
  const api = await getTwitterApiSnapshotCached();
  if (api?.tweets.length) {
    const picked = pickFirstRelevantFromAlerts(api.tweets, slug);
    if (picked) return picked;
  }
  const xml = await fetchPasoCRMzaRssXml();
  if (!xml) return null;
  return pickFirstRelevantTweet(xml, slug);
}
