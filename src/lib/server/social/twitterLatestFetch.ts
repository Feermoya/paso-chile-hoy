import type { LocalLatestTweet } from "@/lib/server/social/twitterLatestLocal";
import { validateLocalLatestTweet } from "@/lib/server/social/twitterLatestLocal";

const PROFILE_URL = "https://x.com/PasoCRMza";

const NITTER_MIRRORS = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.woodland.cafe",
];

const FETCH_TIMEOUT_MS = 18_000;
const RSS_TIMEOUT_MS = 14_000;

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
};

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

function extractFromProfileHydration(html: string): LocalLatestTweet | null {
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
    const candidate: LocalLatestTweet = {
      text,
      url: `https://x.com/PasoCRMza/status/${restId[1]}`,
      date: parseTwitterCreatedAt(created?.[1]),
    };
    if (validateLocalLatestTweet(candidate)) return candidate;
  }
  return null;
}

function extractStatusIds(html: string): string[] {
  const re = /\/PasoCRMza\/status\/(\d{10,25})/g;
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return [...ids];
}

function pickNewestId(ids: string[]): string | null {
  if (ids.length === 0) return null;
  try {
    return ids.reduce((a, b) => (BigInt(a) > BigInt(b) ? a : b));
  } catch {
    return ids.sort((a, b) => b.length - a.length || (a > b ? 1 : -1))[0] ?? null;
  }
}

function decodeHtmlAttr(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractFromStatusHtml(html: string, statusUrl: string): LocalLatestTweet | null {
  const og =
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ??
    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i) ??
    html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/i);

  let text = og?.[1] ? decodeHtmlAttr(og[1]).trim() : "";
  const generic =
    /^the latest posts from @?pasocrmza/i.test(text) ||
    /^posts from @?pasocrmza/i.test(text) ||
    text.length < 10;
  if (generic) {
    const tw = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i);
    const t2 = tw?.[1] ? decodeHtmlAttr(tw[1]).trim() : "";
    if (t2.length >= 10 && !/^on x:/i.test(t2)) text = t2;
  }
  const timeMatch =
    html.match(/<time[^>]*datetime="([^"]+)"/i) ??
    html.match(/datetime="(\d{4}-\d{2}-\d{2}T[^"]+)"/i);
  const date = timeMatch?.[1]?.trim()
    ? parseTwitterCreatedAt(timeMatch[1])
    : new Date().toISOString();
  if (!text || text.length < 10) return null;
  const candidate: LocalLatestTweet = { text, url: statusUrl, date };
  return validateLocalLatestTweet(candidate) ? candidate : null;
}

function toXComUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `https://x.com${u.pathname}${u.search}`;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "https://x.com");
  }
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

function extractRssTitle(item: string): string | null {
  const cdata = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
  if (cdata?.[1]) return decodeXmlEntities(cdata[1].trim());
  const plain = item.match(/<title>([\s\S]*?)<\/title>/i);
  if (plain?.[1]) return decodeXmlEntities(plain[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
  return null;
}

async function tryNitterRss(): Promise<LocalLatestTweet | null> {
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
      if (!xml || !/<item[\s>]/i.test(xml)) continue;
      const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
      if (!itemMatch) continue;
      const inner = itemMatch[1];
      const text = extractRssTitle(inner);
      if (!text || text.trim().length < 10) continue;
      const linkMatch = inner.match(/<link>([\s\S]*?)<\/link>/i);
      const dateMatch = inner.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const urlRaw = linkMatch?.[1]?.trim() ?? "";
      const candidate: LocalLatestTweet = {
        text: text.trim(),
        url: toXComUrl(urlRaw),
        date: dateMatch?.[1]?.trim() ? parseTwitterCreatedAt(dateMatch[1].trim()) : new Date().toISOString(),
      };
      if (validateLocalLatestTweet(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Solo para el job de refresh (no SSR). Intenta X y, si falla, RSS Nitter como respaldo.
 */
export async function fetchLatestTweetFromPasoCRMza(): Promise<LocalLatestTweet | null> {
  try {
    const res = await fetch(PROFILE_URL, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const html = await res.text();
      const h = extractFromProfileHydration(html);
      if (h) return h;
      const newest = pickNewestId(extractStatusIds(html));
      if (newest) {
        const statusUrl = `https://x.com/PasoCRMza/status/${newest}`;
        const sr = await fetch(statusUrl, {
          headers: BROWSER_HEADERS,
          redirect: "follow",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (sr.ok) {
          const sh = await sr.text();
          const s = extractFromStatusHtml(sh, statusUrl);
          if (s) return s;
        }
      }
    }
  } catch {
    /* siguiente capa */
  }

  return tryNitterRss();
}
