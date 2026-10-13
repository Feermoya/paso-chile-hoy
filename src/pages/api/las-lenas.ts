import type { APIRoute } from "astro";
import { getLasLenasSnapshot } from "@/lib/server/las-lenas/getLasLenasSnapshot";
import {
  lasLenasDataIsLive,
  renderLasLenasDynamicHtml,
} from "@/lib/server/las-lenas/renderLasLenasDynamicHtml";

export const prerender = false;

/** Tope de la respuesta HTTP. La consulta en curso sigue y puede llenar la caché. */
const WAIT_MS = 20_000;

function json(body: unknown, status: number, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Clima de Las Leñas. No acepta coordenadas ni URLs: reutiliza getLasLenasSnapshot.
 */
export const GET: APIRoute = async () => {
  try {
    const snapshot = await withTimeout(getLasLenasSnapshot(), WAIT_MS);
    if (!snapshot) {
      return json({ ok: false }, 503, "no-store");
    }
    const { weatherHtml, footHtml } = renderLasLenasDynamicHtml(snapshot);
    return json(
      {
        ok: true,
        weatherHtml,
        footHtml,
        live: lasLenasDataIsLive(snapshot.updatedAt),
      },
      200,
      "public, max-age=30",
    );
  } catch (error) {
    console.warn("[api/las-lenas]", error instanceof Error ? error.message : error);
    return json({ ok: false }, 503, "no-store");
  }
};
