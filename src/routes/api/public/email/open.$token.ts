// Open-tracking pixel for admin email campaigns. Public by design: it only
// records an "open" for the recipient owning this random token.
import { createFileRoute } from "@tanstack/react-router";

const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

function pixel() {
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private" },
  });
}

export const Route = createFileRoute("/api/public/email/open/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = String(params.token || "");
        if (!/^[a-f0-9]{32}$/.test(token)) return pixel();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;
          const { data: r } = await admin.from("email_campaign_recipients").select("id,campaign_id,open_count,first_opened_at").eq("tracking_token", token).maybeSingle();
          if (r) {
            const now = new Date().toISOString();
            await admin.from("email_campaign_recipients").update({ open_count: (r.open_count ?? 0) + 1, first_opened_at: r.first_opened_at ?? now }).eq("id", r.id);
            await admin.from("email_tracking_events").insert({ campaign_id: r.campaign_id, recipient_id: r.id, event_type: "open", user_agent: (request.headers.get("user-agent") || "").slice(0, 300) });
          }
        } catch { /* never fail the pixel */ }
        return pixel();
      },
    },
  },
});
