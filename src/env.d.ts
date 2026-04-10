/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** `1` / `true` — vuelca PassRaw/PassView en consola (API y home). Opcional en `.env`. */
  readonly DEBUG_PASSES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
