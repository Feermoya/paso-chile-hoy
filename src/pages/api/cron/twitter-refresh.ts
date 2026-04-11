import type { APIRoute } from "astro";
import { runTwitterLatestRefresh } from "@/lib/server/social/twitterLatestRefresh";

export const prerender = false;

function authorize(request: Request, secret: string): boolean {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export const GET: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (!authorize(request, secret)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const result = await runTwitterLatestRefresh();
  const status =
    result.action === "persist_skipped" ? 503 : result.ok ? 200 : 500;

  return new Response(JSON.stringify(result), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
