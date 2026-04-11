import type { PassTweetSentiment } from "@/types/pass-view";

/** Heurística para UI (páginas de paso); no es dato oficial. */
export function tweetSentiment(text: string): PassTweetSentiment {
  const t = text.toLowerCase();
  if (
    t.includes("habilitado") ||
    t.includes("abierto") ||
    t.includes("habilitación") ||
    t.includes("habilitacion")
  )
    return "habilitado";
  if (
    t.includes("cerrado") ||
    t.includes("cierre") ||
    t.includes("suspensión") ||
    t.includes("suspension")
  )
    return "cerrado";
  if (
    t.includes("condicionado") ||
    t.includes("precaución") ||
    t.includes("precaucion") ||
    t.includes("demoras")
  )
    return "condicionado";
  return "info";
}
