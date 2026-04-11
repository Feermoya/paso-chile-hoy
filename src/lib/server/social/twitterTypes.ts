/**
 * Snapshot de @PasoCRMza en `public/snapshots/tweets.json`.
 * Solo se escribe desde el scraper (p. ej. `npm run scrape`).
 */

export type TweetSnapshotSource = "x-scrape" | "status-scrape" | "nitter-rss";

export interface LatestTweetSnapshot {
  text: string;
  url: string;
  date: string;
  source: TweetSnapshotSource;
}

/** Avisos recientes derivados del mismo scrape (páginas de paso + TwitterAlerts). Opcional si no hay RSS. */
export interface PassTwitterAlert {
  text: string;
  date: string;
  url: string;
  passesmentioned: string[];
  alertType: "cierre" | "apertura" | "condicion" | "info";
}

export interface TweetsSnapshotFile {
  latestTweet: LatestTweetSnapshot | null;
  updatedAt: string;
  /** Misma corrida que `latestTweet`; vacío si solo hubo un post vía status sin lista RSS. */
  passAlerts?: PassTwitterAlert[];
}
