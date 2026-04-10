/**
 * Extrae bloques "Atención" del HTML de detalle de gob.ar (markdown embebido y/o headings HTML).
 */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAlertSection(raw: string): string {
  let s = raw.split(/^---$/m)[0] ?? raw;
  s = s.split(/#{2,}/)[0] ?? s;
  return s
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeAlerts(alerts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of alerts) {
    const key = a.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);
    if (key.length < 8 || seen.has(key)) continue;
    seen.add(key);
    out.push(a.replace(/\s+/g, " ").trim());
  }
  return out;
}

export function extractAlertsFromDetailHTML(html: string): string[] {
  const alerts: string[] = [];
  if (!html?.trim()) return alerts;

  const mdParts = html.split(/#{4,5}\s*Atenci[oó]n/gi);
  if (mdParts.length > 1) {
    for (let i = 1; i < mdParts.length; i++) {
      const section = cleanAlertSection(mdParts[i]);
      if (section.length > 8) alerts.push(section);
    }
  }

  if (alerts.length === 0) {
    const re = /<h[45][^>]*>\s*Atenci[oó]n\s*<\/h[45]>/gi;
    const parts = html.split(re);
    for (let i = 1; i < parts.length; i++) {
      let chunk = parts[i] ?? "";
      const nextH = chunk.search(/<h[1-6][\s>]/i);
      if (nextH > 0) chunk = chunk.slice(0, nextH);
      const text = stripHtmlToText(chunk);
      if (text.length > 8) alerts.push(text);
    }
  }

  return dedupeAlerts(alerts);
}
