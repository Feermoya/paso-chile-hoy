import type { DataConfidence, PassStatus, RiskLevel } from "@/types";

const statusLabels: Record<PassStatus, string> = {
  open: "Abierto",
  closed: "Cerrado",
  conditional: "Condicionado",
};

/** Clases Tailwind para acento sutil según estado (sin neón). */
export function statusAccentClass(status: PassStatus): string {
  switch (status) {
    case "open":
      return "text-status-open ring-status-open/25 bg-status-open/[0.06]";
    case "closed":
      return "text-status-closed ring-status-closed/20 bg-status-closed/[0.06]";
    case "conditional":
      return "text-status-conditional ring-status-conditional/25 bg-status-conditional/[0.07]";
    default:
      return "text-ink-muted ring-line/20 bg-surface-muted";
  }
}

export function statusLabel(status: PassStatus): string {
  return statusLabels[status];
}

const confidenceLabels: Record<DataConfidence, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function confidenceLabel(c: DataConfidence): string {
  return confidenceLabels[c];
}

const riskLabels: Record<RiskLevel, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
};

export function riskLabel(r: RiskLevel): string {
  return riskLabels[r];
}
