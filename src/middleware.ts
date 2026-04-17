import { defineMiddleware } from "astro:middleware";

const CANONICAL_HOST = "pasochilehoy.com";

/**
 * Una sola redirección www → apex a nivel de aplicación.
 * Evita definir lo mismo en `vercel.json` por recurso: redirigir `/_app/*` u otros estáticos
 * desde www hacia apex rompe scripts (redirect cross-origin + CORS) y puede generar bucles
 * si el panel de Vercel ya redirige en sentido contrario.
 */
export const onRequest = defineMiddleware((context, next) => {
  if (context.url.hostname === `www.${CANONICAL_HOST}`) {
    const target = new URL(context.url.pathname + context.url.search, `https://${CANONICAL_HOST}`);
    return Response.redirect(target.toString(), 308);
  }
  return next();
});
