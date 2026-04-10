import type { PassView } from "@/types/pass-view";
import type { WeatherNowView } from "@/types/pass-view";

/** True si `PassDetails` tiene al menos un bloque con contenido. */
export function passDetailsHasContent(
  view: PassView,
  options?: { /** Horario ya mostrado en el hero — no cuenta para decidir si hay bloque útil. */
    treatScheduleAsHidden?: boolean;
  },
): boolean {
  const op = view.operationalInfo;
  const scheduleVisible =
    !options?.treatScheduleAsHidden &&
    Boolean(
      op.schedule?.trim() || op.scheduleFrom?.trim() || op.scheduleTo?.trim(),
    );
  return Boolean(
    scheduleVisible ||
      op.contact?.phone ||
      op.contact?.telHref ||
      op.gps?.openInMapsHref ||
      (op.gps?.lat != null && op.gps?.lng != null) ||
      view.usefulLinks.length > 0 ||
      view.providers.length > 0 ||
      view.meta.scrapedAt?.trim() ||
      view.meta.sourceUrl?.trim(),
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
