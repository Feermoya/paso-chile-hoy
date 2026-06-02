import { shouldSuppressMotivoAlert } from "@/utils/motivoFilters";
import { dedupeHtmlAlertsAgainstJson } from "@/utils/dedupeHtmlAlerts";

export type OperationalNoticeTone = "danger" | "warning" | "info";

export interface OperationalNotice {
  id: string;
  tone: OperationalNoticeTone;
  label: string;
  text: string;
}

function normalizeCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function isNearDuplicate(text: string, seen: string[]): boolean {
  const t = normalizeCompare(text);
  if (t.length < 8) return true;
  for (const prev of seen) {
    const p = normalizeCompare(prev);
    if (p === t) return true;
    if (p.includes(t) || t.includes(p)) return true;
    for (let n = Math.min(48, t.length); n >= 14; n--) {
      if (p.includes(t.slice(0, n))) return true;
    }
  }
  return false;
}

function buildVialidadTitle(estado: string, ruta: string, tramo: string): string {
  const parts: string[] = [];
  const e = estado.trim();
  if (e && e.toUpperCase() !== "HABILITADA") {
    parts.push(
      e
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" "),
    );
  }
  const rn = ruta.trim();
  if (rn) parts.push(`RN ${rn}`);
  const tr = tramo.trim();
  if (tr) parts.push(tr);
  return parts.join(" · ");
}

/** Evita repetir en alertas lo que ya dice el badge del hero (p. ej. «Paso cerrado»). */
function paraphrasesStatusBadge(text: string, statusLabel: string): boolean {
  const t = normalizeCompare(text);
  const badge = normalizeCompare(statusLabel);
  if (!badge || badge === "sin datos") return false;
  if (t === badge) return true;
  const closed =
    badge.includes("cerrado") &&
    (t.includes("paso cerrado") || t.includes("cierre") || t === "cerrado");
  const open = badge.includes("abierto") && t.includes("paso abierto");
  return closed || open;
}

export interface BuildOperationalNoticesInput {
  motivo?: string | null;
  motivoInfo?: string | null;
  htmlAlerts?: string[];
  vialidadRuta?: string;
  vialidadTramo?: string;
  vialidadEstado?: string;
  vialidadObservaciones?: string;
  /** Texto visible en el hero (ABIERTO, CERRADO, …). */
  statusDisplayLabel?: string;
}

export function buildOperationalNotices(input: BuildOperationalNoticesInput): OperationalNotice[] {
  const statusLabel = input.statusDisplayLabel?.trim() ?? "";
  const seen: string[] = [];
  const notices: OperationalNotice[] = [];

  const push = (id: string, tone: OperationalNoticeTone, label: string, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length < 4) return;
    if (paraphrasesStatusBadge(clean, statusLabel)) return;
    if (isNearDuplicate(clean, seen)) return;
    seen.push(clean);
    notices.push({ id, tone, label, text: clean });
  };

  const estU = (input.vialidadEstado ?? "").trim().toUpperCase();
  const showVialidad = Boolean(estU && estU !== "HABILITADA");
  const obs = (input.vialidadObservaciones ?? "").trim();
  const showObs =
    Boolean(obs) && obs.toLowerCase() !== "transitable" && obs.length > 3;
  const isCorteTotal = estU === "CORTE TOTAL" || estU.includes("CORTE TOTAL");

  if (showVialidad) {
    const title = buildVialidadTitle(
      input.vialidadEstado ?? "",
      input.vialidadRuta ?? "",
      input.vialidadTramo ?? "",
    );
    const body = [title, showObs ? obs : ""].filter(Boolean).join(". ");
    push(
      "vialidad",
      isCorteTotal ? "danger" : "warning",
      "Vialidad Nacional",
      body,
    );
  } else if (showObs) {
    push("vialidad-obs", "info", "Ruta de acceso", obs);
  }

  const m = input.motivo?.trim() ?? "";
  const info = input.motivoInfo?.trim() ?? "";
  const showMotivo = Boolean(m) && !shouldSuppressMotivoAlert(m);
  const showMotivoInfo = Boolean(info);

  if (showMotivo && showMotivoInfo) {
    const merged = isNearDuplicate(info, [m]) ? m : `${m}. ${info}`;
    push("motivo-merged", "warning", "Motivo oficial", merged);
  } else {
    if (showMotivoInfo) push("motivo-info", "warning", "Motivo oficial", info);
    if (showMotivo) push("motivo", "warning", "Motivo oficial", m);
  }

  const htmlExtra = dedupeHtmlAlertsAgainstJson(input.htmlAlerts, {
    motivo: m || null,
    motivoInfo: info || null,
    vialidadObservaciones: obs || null,
  });

  htmlExtra.forEach((text, i) => {
    push(`html-${i}`, "warning", "Aviso", text);
  });

  return notices;
}
