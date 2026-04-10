import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PassPageSnapshot } from "@/lib/server/types/pass";
import { parseProviderDateToIso } from "@/lib/server/utils/parseHelpers";
import type {
  ForecastItemRaw,
  LinkRaw,
  PassRaw,
  ProviderRaw,
  WeatherNowRaw,
} from "@/types/pass-raw";

/** Raíz del repo: scripts y Astro deben ejecutarse con cwd en el proyecto. */
function resolveSnapshotsDir(): string {
  return path.join(process.cwd(), "data", "snapshots");
}

function pathForSlug(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (safe !== slug || !safe) {
    throw new Error("INVALID_SLUG_FOR_STORAGE");
  }
  return path.join(resolveSnapshotsDir(), `${safe}.json`);
}

function isLegacyPassPageSnapshot(o: Record<string, unknown>): o is PassPageSnapshot {
  return (
    typeof o.slug === "string" &&
    typeof o.sourceUrl === "string" &&
    typeof o.fetchedAt === "string" &&
    typeof o.status === "string" &&
    "passName" in o
  );
}

function isPassRawShape(o: Record<string, unknown>): boolean {
  if (typeof o.slug !== "string" || typeof o.sourceUrl !== "string") return false;
  if (typeof o.scrapedAt !== "string" && typeof o.fetchedAt !== "string") return false;
  if (isLegacyPassPageSnapshot(o)) return false;
  return true;
}

function migrateLegacyToPassRaw(legacy: PassPageSnapshot): PassRaw {
  const cw = legacy.currentWeather;
  let currentWeather: WeatherNowRaw | undefined;
  if (cw) {
    const temperatureC =
      cw.temperatureC != null && Number.isFinite(cw.temperatureC) ? cw.temperatureC : undefined;
    const visibilityKm =
      cw.visibilityKm != null && Number.isFinite(cw.visibilityKm) ? cw.visibilityKm : undefined;
    const desc = cw.condition?.trim();
    const wind = cw.windText?.trim();
    const sunrise = cw.sunrise?.trim();
    const sunset = cw.sunset?.trim();
    const providerNote = cw.updatedAt?.trim();
    if (
      desc ||
      wind ||
      sunrise ||
      sunset ||
      providerNote ||
      temperatureC != null ||
      visibilityKm != null
    ) {
      currentWeather = {
        description: desc || undefined,
        temperatureC,
        wind: wind || undefined,
        visibilityKm,
        sunrise: sunrise || undefined,
        sunset: sunset || undefined,
        providerNote: providerNote || undefined,
      };
    }
  }

  const forecast: ForecastItemRaw[] = (legacy.next24h ?? []).map((p) => {
    const temperatureC =
      p.temperatureC != null && Number.isFinite(p.temperatureC) ? p.temperatureC : undefined;
    const wind =
      [p.windDirection, p.windSpeedText].filter(Boolean).join(" ").trim() || undefined;
    return {
      period: p.label || undefined,
      description: p.condition || undefined,
      temperatureC,
      wind: wind || undefined,
      visibility: p.visibility || undefined,
    };
  });

  const usefulLinks: LinkRaw[] = (legacy.usefulLinks ?? []).map((l) => ({
    text: l.label || undefined,
    url: l.href || undefined,
  }));

  const providers: ProviderRaw[] = (legacy.providers ?? []).map((p) => ({
    name: p.name,
    lastUpdatedRaw: p.updatedAt ?? undefined,
    lastUpdated: parseProviderDateToIso(p.updatedAt),
  }));

  const contact =
    legacy.contact?.trim() ?
      { phone: legacy.contact.trim() }
    : undefined;

  return {
    slug: legacy.slug,
    name: legacy.passName ?? undefined,
    provinceAR: legacy.province ?? undefined,
    countryCL: legacy.borderingCountry ?? undefined,
    routeDescription: legacy.routeDescription ?? undefined,
    schedule: legacy.schedule ?? undefined,
    contact,
    currentWeather,
    forecast,
    usefulLinks,
    providers,
    alerts: [],
    scrapedAt: legacy.fetchedAt,
    sourceUrl: legacy.sourceUrl,
  };
}

function coerceScrapedAt(raw: PassRaw): PassRaw {
  if (raw.scrapedAt?.trim()) return raw;
  const any = raw as unknown as { fetchedAt?: string };
  if (typeof any.fetchedAt === "string" && any.fetchedAt.trim()) {
    return { ...raw, scrapedAt: any.fetchedAt.trim() };
  }
  return raw;
}

/** Completa arrays y normaliza `scrapedAt` si vino un snapshot híbrido. */
function enrichPassRaw(raw: PassRaw): PassRaw {
  const r = coerceScrapedAt(raw);
  return {
    ...r,
    alerts: Array.isArray(r.alerts) ? r.alerts : [],
    forecast: Array.isArray(r.forecast) ? r.forecast : [],
    usefulLinks: Array.isArray(r.usefulLinks) ? r.usefulLinks : [],
    providers: Array.isArray(r.providers) ? r.providers : [],
  };
}

export async function ensureSnapshotsDir(): Promise<string> {
  const dir = resolveSnapshotsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writePassSnapshotFile(slug: string, snapshot: PassRaw): Promise<void> {
  if (snapshot.slug !== slug) {
    throw new Error("SNAPSHOT_SLUG_MISMATCH");
  }
  await ensureSnapshotsDir();
  const filePath = pathForSlug(slug);
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;
  await writeFile(filePath, body, "utf8");
}

export async function readPassSnapshotFile(slug: string): Promise<PassRaw | null> {
  try {
    const rawFile = await readFile(pathForSlug(slug), "utf8");
    const parsed: unknown = JSON.parse(rawFile);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;

    if (isLegacyPassPageSnapshot(o)) {
      return enrichPassRaw(migrateLegacyToPassRaw(o));
    }

    if (!isPassRawShape(o)) return null;
    return enrichPassRaw(parsed as PassRaw);
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "ENOENT") return null;
    return null;
  }
}

export async function listStoredSnapshotSlugs(): Promise<string[]> {
  try {
    const dir = resolveSnapshotsDir();
    const names = await readdir(dir);
    return names
      .filter((n: string) => n.endsWith(".json"))
      .map((n: string) => n.replace(/\.json$/i, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}
