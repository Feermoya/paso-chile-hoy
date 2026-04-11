import type { PassView } from "@/types/pass-view";

export function heroScheduleFromView(v: PassView): string {
  const o = v.operationalInfo;
  const scheduleRaw = o.scheduleRaw?.trim();
  if (scheduleRaw) return scheduleRaw;
  const raw = o.schedule?.trim();
  if (raw) return raw.replace(/^horario:\s*/i, "").replace(/\s*h\s*$/i, "").trim();
  if (o.scheduleFrom && o.scheduleTo) return `${o.scheduleFrom}–${o.scheduleTo} h`;
  return "";
}
