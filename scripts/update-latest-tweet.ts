/**
 * Actualiza el snapshot local (y Redis si hay KV_REST_* en el entorno).
 *
 * Uso:
 *   npm run twitter:update -- --text="..." --url="https://x.com/PasoCRMza/status/ID"
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateLocalLatestTweet,
  validateTwitterLatestFile,
  persistSnapshot,
  type LocalLatestTweet,
  type TwitterLatestFile,
} from "../src/lib/server/social/twitterLatestLocal.ts";

function parseArgs(): { text?: string; url?: string; date?: string } {
  const out: { text?: string; url?: string; date?: string } = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--text=")) out.text = a.slice("--text=".length);
    else if (a === "--text") out.text = argv[++i];
    else if (a.startsWith("--url=")) out.url = a.slice("--url=".length);
    else if (a === "--url") out.url = argv[++i];
    else if (a.startsWith("--date=")) out.date = a.slice("--date=".length);
    else if (a === "--date") out.date = argv[++i];
  }
  return out;
}

async function main(): Promise<void> {
  const { text, url, date } = parseArgs();
  if (!text?.trim() || !url?.trim()) {
    console.error(
      "Uso: npm run twitter:update -- --text=\"...\" --url=\"https://x.com/PasoCRMza/status/ID\" [--date=ISO]",
    );
    process.exit(1);
  }

  const dateIso = date?.trim() ? date.trim() : new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const latestTweet: LocalLatestTweet = {
    text: text.trim(),
    url: url.trim(),
    date: dateIso,
  };

  if (!validateLocalLatestTweet(latestTweet)) {
    console.error(
      "[twitter:update] Validación fallida: text>=10 chars, url https a x.com/twitter con /PasoCRMza/status/<id>, date ISO válida.",
    );
    process.exit(1);
  }

  const payload: TwitterLatestFile = {
    latestTweet,
    updatedAt,
    lastSuccessfulRefreshAt: updatedAt,
    lastAttemptAt: updatedAt,
  };

  if (!validateTwitterLatestFile(payload)) {
    console.error("[twitter:update] Payload inválido.");
    process.exit(1);
  }

  const ok = await persistSnapshot(payload);
  if (!ok) {
    console.error("[twitter:update] No se pudo persistir (¿Vercel sin Redis?).");
    process.exit(1);
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  console.log(`[twitter:update] OK (archivo y/o Redis) → ${join(root, "public/snapshots/twitter-latest.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
