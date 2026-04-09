const esAR = "es-AR";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(esAR, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatRelativeDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(esAR, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}
