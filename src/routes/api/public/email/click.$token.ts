// Click tracking for admin email campaigns. Redirects only to links that were
// actually part of the campaign (no open redirect).
import { createFileRoute } from "@tanstack/react-router";

const FALLBACK = "https://mbacompass.in/";

export const Route = createFileRoute("/api/public/email/click/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = String(params.token || "");
        const target = new URL(request.url).searchParams.get("u") || "";
        if (!/^[a-f0-9]{32}$/.test(token) || !/^https?:\/\//i.test(target)) return Response.redirect(FALLBACK, 302);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;
          const { data: r } = await admin.from("email_campaign_recipients").select("id,campaign_id,click_count,first_clicked_at,open_count,first_opened_at").eq("tracking_token", token).maybeSingle();
          if (!r) return Response.redirect(FALLBACK, 302);
          const { data: c } = await admin.from("email_campaigns").select("body_html,ctas").eq("id", r.campaign_id).maybeSingle();
          const allowed = new Set<string>();
          for (const m of String(c?.body_html || "").matchAll(/href\s*=\s*"([^"]+)"/gi)) allowed.add(m[1].replaceAll("&amp;", "&"));
          for (const x of (c?.ctas as any[]) ?? []) if (x?.url) allowed.add(x.url);
          if (!allowed.has(target)) return Response.redirect(FALLBACK, 302);
          const now = new Date().toISOString();
          await admin.from("email_campaign_recipients").update({
            click_count: (r.click_count ?? 0) + 1,
            first_clicked_at: r.first_clicked_at ?? now,
            // A click proves the email was opened even if images were blocked.
            first_opened_at: r.first_opened_at ?? now,
            open_count: Math.max(r.open_count ?? 0, 1),
          }).eq("id", r.id);
          await admin.from("email_tracking_events").insert({ campaign_id: r.campaign_id, recipient_id: r.id, event_type: "click", url: target.slice(0, 2000), user_agent: (request.headers.get("user-agent") || "").slice(0, 300) });
          return Response.redirect(target, 302);
        } catch {
          return Response.redirect(FALLBACK, 302);
        }
      },
    },
  },
});
