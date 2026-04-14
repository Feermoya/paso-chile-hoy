const CRISTO_REDENTOR_WINTER_2026_START = new Date("2026-06-01T00:00:00-03:00").getTime();

export function getCristoRedentorScheduleOverride(slug: string, now: Date = new Date()): string | null {
  if (slug !== "cristo-redentor") return null;
  if (now.getTime() >= CRISTO_REDENTOR_WINTER_2026_START) return null;
  return "00:00-23:59";
}

export function getCristoRedentorManualNotice(slug: string, now: Date = new Date()): string | null {
  if (slug !== "cristo-redentor") return null;
  if (now.getTime() >= CRISTO_REDENTOR_WINTER_2026_START) return null;
  return "Cristo Redentor continúa operativo las 24 horas. El horario de invierno con suspensión nocturna empieza en junio. En Chile ya rige el huso horario de invierno: al cruzar la cordillera, atrasá el reloj 1 hora.";
}

export function getCristoRedentorScheduleLabelOverride(slug: string, now: Date = new Date()): string | null {
  if (slug !== "cristo-redentor") return null;
  if (now.getTime() >= CRISTO_REDENTOR_WINTER_2026_START) return null;
  return "HABILITADO LAS 24 HS";
}
