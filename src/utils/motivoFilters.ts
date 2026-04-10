/**
 * Fragmentos de la API (demoras, motivos, observaciones) que no deben
 * formar parte del campo `motivo` unido del snapshot.
 */
export function shouldFilterMotivoFragment(s: string | undefined | null): boolean {
  const t = s?.trim();
  if (!t) return true;
  if (t === "-.-") return true;
  if (t.length <= 2) return true;
  if (/^0\s*hs?\s*\d*\s*minutos?$/i.test(t)) return true;
  return false;
}

/** Segunda línea de defensa en UI: no mostrar alerta de motivo si es solo ruido. */
export function shouldSuppressMotivoAlert(motivo: string): boolean {
  const m = motivo.trim();
  if (!m) return true;
  if (m.toUpperCase().includes("HORARIO DE ATENCION")) return true;
  if (m === "-.-") return true;
  if (/^0\s*hs?\s*\d*\s*minutos?$/i.test(m)) return true;
  return false;
}
