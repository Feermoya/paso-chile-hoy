/**
 * Actualiza el DOM de la página del paso tras un POST /api/refresh/:slug (sin recargar).
 */
import type { PassView } from "@/types/pass-view";
import type { PassDisplayStatus, PassStatusResult } from "@/utils/inferPassStatus";

export interface PassRefreshEnvelope {
  view: PassView;
  statusResult: PassStatusResult;
  scheduleText: string;
  lastUpdatedRelative: string;
  officialUrl?: string;
  showNow: boolean;
  showForecast: boolean;
  stale: boolean;
  refreshFailed: boolean;
  message?: string;
  lastKnownGoodRelative?: string;
}

const LABELS: Record<PassDisplayStatus, string> = {
  abierto: "ABIERTO",
  condicionado: "CONDICIONADO",
  cerrado: "CERRADO",
  sin_datos: "SIN DATOS",
};

function escapeSlug(slug: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(slug);
  return slug.replace(/[^a-zA-Z0-9_-]/g, "");
}

function applyHero(slug: string, env: PassRefreshEnvelope): void {
  const root = document.querySelector(
    `[data-status-hero-root][data-hero-slug="${escapeSlug(slug)}"]`,
  );
  if (!root) return;

  const { statusResult, scheduleText, lastUpdatedRelative, view } = env;
  const status = statusResult.status;
  const displayLabel = statusResult.displayLabel?.trim() || LABELS[status];
  const rawStatus = view.operationalInfo.rawStatus?.trim() ?? "";

  root.setAttribute("data-pass-status", status);

  const labelEl = root.querySelector("[data-hero-label]");
  if (labelEl instanceof HTMLElement) {
    labelEl.textContent = displayLabel;
    labelEl.setAttribute("data-status", status);
    labelEl.className = `text-status status-badge status-badge--${status}`;
  }

  const dot = root.querySelector("[data-hero-dot]");
  if (dot instanceof HTMLElement) {
    dot.classList.remove(
      "status-dot--open",
      "status-dot--cerrado",
      "status-dot--condicionado",
      "status-dot--unknown",
    );
    const upper = displayLabel.toUpperCase();
    if (upper === "ABIERTO") dot.classList.add("status-dot--open");
    else if (upper === "CERRADO") dot.classList.add("status-dot--cerrado");
    else if (upper === "CONDICIONADO") dot.classList.add("status-dot--condicionado");
    else dot.classList.add("status-dot--unknown");

    if (status === "sin_datos" || rawStatus === "SIN_DATOS") {
      dot.classList.remove("status-dot--live-pulse");
    } else {
      dot.classList.add("status-dot--live-pulse");
    }
  }

  const schedRow = root.querySelector("[data-hero-schedule-row]");
  const schedText = root.querySelector("[data-hero-schedule-text]");
  if (scheduleText.trim()) {
    schedRow?.classList.remove("hidden");
    if (schedText) schedText.textContent = scheduleText;
  } else {
    schedRow?.classList.add("hidden");
  }

  const ts = root.querySelector("[data-hero-timestamp]");
  const tsWrap = root.querySelector("[data-hero-timestamp-wrap]");
  if (lastUpdatedRelative.trim()) {
    tsWrap?.classList.remove("hidden");
    if (ts) ts.textContent = `Actualizado ${lastUpdatedRelative}`;
  } else {
    tsWrap?.classList.add("hidden");
  }

  root.querySelectorAll("[data-status-countdown-root]").forEach((el) => el.remove());

  const secondary = root.querySelector(".status-secondary");
  const refreshRow = secondary?.querySelector(".status-refresh-row");
  if (
    secondary instanceof HTMLElement &&
    refreshRow &&
    statusResult.opensInMinutes != null &&
    statusResult.opensInMinutes > 0
  ) {
    const div = document.createElement("div");
    div.className = "status-countdown";
    div.setAttribute("data-status-countdown-root", "");
    div.setAttribute("data-minutes", String(statusResult.opensInMinutes));
    div.setAttribute("data-direction", "opens");
    div.innerHTML = `<span class="countdown-label">Abre en</span><span class="countdown-value">${Math.floor(statusResult.opensInMinutes / 60)}h ${statusResult.opensInMinutes % 60}min</span>`;
    secondary.insertBefore(div, refreshRow);
  } else if (
    secondary instanceof HTMLElement &&
    refreshRow &&
    (status === "abierto" || status === "condicionado") &&
    statusResult.closesInMinutes != null &&
    statusResult.closesInMinutes > 0
  ) {
    const m = statusResult.closesInMinutes;
    const div = document.createElement("div");
    div.className = "status-countdown status-countdown--warning";
    div.setAttribute("data-status-countdown-root", "");
    div.setAttribute("data-minutes", String(m));
    div.setAttribute("data-direction", "closes");
    const short = m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`;
    div.innerHTML = `<span class="countdown-label countdown-label--warning">Cierra en</span><span class="countdown-value countdown-value--warning">${short}</span>`;
    secondary.insertBefore(div, refreshRow);
  }

  const sinMsg = root.querySelector("[data-hero-sin-datos-msg]");
  if (sinMsg instanceof HTMLElement) {
    const showSin =
      rawStatus === "SIN_DATOS" &&
      Boolean(view.meta.scrapeError?.trim() || view.meta.operationalStale);
    sinMsg.classList.toggle("hidden", !showSin);
    const sinSub = root.querySelector("[data-hero-sin-datos-sub]");
    if (sinSub instanceof HTMLElement) {
      sinSub.textContent =
        view.meta.scrapeError?.trim() ||
        "No pudimos obtener el estado actual. Verificá la fuente oficial.";
    }
    const sinLkg = root.querySelector("[data-hero-last-known]");
    if (sinLkg instanceof HTMLElement) {
      const rel = env.lastKnownGoodRelative?.trim();
      if (rel && view.meta.lastKnownGoodAt) {
        sinLkg.classList.remove("hidden");
        sinLkg.textContent = `Último dato confiable: hace ${rel}`;
      } else {
        sinLkg.classList.add("hidden");
        sinLkg.textContent = "";
      }
    }
  }
}

function applyStaleBanner(slug: string, env: PassRefreshEnvelope): void {
  const el = document.getElementById(`paso-stale-banner-${escapeSlug(slug)}`);
  if (!(el instanceof HTMLElement)) return;
  if (env.stale && env.message?.trim()) {
    el.textContent = env.message.trim();
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function applyWeather(slug: string, env: PassRefreshEnvelope): void {
  const shell = document.querySelector(`[data-paso-page-shell][data-shell-slug="${escapeSlug(slug)}"]`);
  const section = shell?.querySelector("[data-paso-weather-section]");
  if (!section) return;

  const unavail = section.querySelector("[data-paso-weather-unavailable]");
  const card = section.querySelector("[data-paso-weather-now-card]");
  const forecastSec = section.querySelector("[data-forecast-section]");

  const now = env.view.weather?.now;
  const hasNow = Boolean(env.showNow && now);

  if (hasNow && !card) {
    window.location.reload();
    return;
  }

  if (hasNow && card instanceof HTMLElement) {
    unavail?.classList.add("hidden");
    card.classList.remove("hidden");
    const t = section.querySelector("[data-wn-temp]");
    const d = section.querySelector("[data-wn-desc]");
    if (t && now!.temperatureC != null) t.textContent = String(now!.temperatureC);
    if (d) d.textContent = now!.description?.trim() || "";
  } else {
    unavail?.classList.remove("hidden");
    card?.classList.add("hidden");
  }

  if (forecastSec instanceof HTMLElement) {
    if (env.showForecast && hasNow) {
      forecastSec.classList.remove("hidden");
    } else {
      forecastSec.classList.add("hidden");
    }
  }
}

export function applyPassRefreshToPage(slug: string, env: PassRefreshEnvelope): void {
  applyHero(slug, env);
  applyStaleBanner(slug, env);
  applyWeather(slug, env);
}
