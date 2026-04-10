function readDebugPassesFlag(): string | undefined {
  const fromProcess =
    typeof process !== "undefined" && process.env?.DEBUG_PASSES ? process.env.DEBUG_PASSES : undefined;
  const fromMeta =
    typeof import.meta !== "undefined" && import.meta.env?.DEBUG_PASSES ?
      String(import.meta.env.DEBUG_PASSES)
    : undefined;
  return fromProcess ?? fromMeta;
}

/**
 * Logs voluminosos del pipeline PassRaw / PassView solo si `DEBUG_PASSES=1` o `true`.
 * Configurá en `.env` (Astro lo expone en `import.meta.env`) o en el entorno del proceso.
 * No activar en producción salvo depuración puntual.
 */
export function isPassDebugEnabled(): boolean {
  const v = readDebugPassesFlag()?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function logPassPipelineDebug(
  context: string,
  payload: { raw?: unknown; view?: unknown },
): void {
  if (!isPassDebugEnabled()) return;
  if (payload.raw !== undefined) {
    console.log(`[DEBUG_PASSES][${context}] PassRaw`, JSON.stringify(payload.raw, null, 2));
  }
  if (payload.view !== undefined) {
    console.log(`[DEBUG_PASSES][${context}] PassView`, JSON.stringify(payload.view, null, 2));
  }
}
