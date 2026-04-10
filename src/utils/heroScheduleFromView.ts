import type { PassView } from "@/types/pass-view";

export function heroScheduleFromView(v: PassView): string {
  const o = v.operationalInfo;
  const raw = o.schedule?.trim();
  if (raw) return raw.replace(/^horario:\s*/i, "").trim();
  if (o.scheduleFrom && o.scheduleTo) return `${o.scheduleFrom}–${o.scheduleTo} h`;
  return "";
}
