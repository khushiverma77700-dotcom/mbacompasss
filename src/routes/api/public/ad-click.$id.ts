import { createFileRoute } from "@tanstack/react-router";

// Tracked ad click. Only ever redirects to the destination saved on the campaign,
// so it cannot be abused as an open redirect.
export const Route = createFileRoute("/api/public/ad-click/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const id = String(params.id || "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: ad } = await supabaseAdmin.from("ad_campaigns").select("id,status,destination_url").eq("id", id).maybeSingle();
        if (!ad || ad.status !== "active" || !/^https?:\/\/|^\//.test(ad.destination_url)) return Response.redirect(new URL("/", request.url).toString(), 302);
        const url = new URL(request.url);
        const ua = request.headers.get("user-agent") || "";
        const ref = request.headers.get("referer");
        let path: string | null = null;
        try { path = ref ? new URL(ref).pathname.slice(0, 400) : null; } catch { /* ignore */ }
        if (!/bot|crawl|spider|preview/i.test(ua)) {
          await supabaseAdmin.from("ad_events").insert({
            campaign_id: id, event_type: "click", placement: (url.searchParams.get("p") || "").slice(0, 40),
            page_path: path, device: /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
          });
        }
        const dest = ad.destination_url.startsWith("/") ? new URL(ad.destination_url, request.url).toString() : ad.destination_url;
        return new Response(null, { status: 302, headers: { Location: dest, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
      },
    },
  },
});
