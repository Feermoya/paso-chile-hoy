import type { PassView } from "@/types/pass-view";
import type { WeatherNowView } from "@/types/pass-view";

/** True si `PassDetails` tiene al menos un bloque con contenido. */
export function passDetailsHasContent(view: PassView): boolean {
  const op = view.operationalInfo;
  return Boolean(
    op.schedule?.trim() ||
      op.scheduleFrom?.trim() ||
      op.scheduleTo?.trim() ||
      op.contact?.phone ||
      op.contact?.telHref ||
      op.gps?.openInMapsHref ||
      (op.gps?.lat != null && op.gps?.lng != null) ||
      view.usefulLinks.length > 0 ||
      view.providers.length > 0 ||
      view.meta.scrapedAt?.trim(),
  );
}

/** True si el bloque “clima ahora” tiene algo que mostrar (evita tarjeta vacía). */
export function weatherNowHasDisplayableContent(now: WeatherNowView): boolean {
  return Boolean(
    now.description ||
      now.temperatureC != null ||
      now.wind ||
      now.visibilityKm != null ||
      now.visibilityText ||
      now.sunrise ||
      now.sunset ||
      now.providerNote,
  );
}
