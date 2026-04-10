#!/usr/bin/env node
/**
 * Requiere `npm run dev` en otra terminal (servidor Astro en marcha).
 * Uso: node scripts/debug-pass.mjs cristo-redentor
 *      BASE_URL=http://127.0.0.1:4321 node scripts/debug-pass.mjs las-lenas
 */

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/debug-pass.mjs <slug>");
  process.exit(1);
}

const base = process.env.BASE_URL ?? "http://127.0.0.1:4321";
const url = `${base.replace(/\/$/, "")}/api/pass/${encodeURIComponent(slug)}`;

const res = await fetch(url);
const body = await res.text();
console.log("HTTP", res.status, url);
try {
  console.log(JSON.stringify(JSON.parse(body), null, 2));
} catch {
  console.log(body);
}
