// Scheduled dispatcher for WhatsApp Automation campaigns.
//
// Called by the database scheduler with the shared automation secret. Each call
// resumes the queue where it stopped: retries first, then new numbers, capped
// by every campaign's daily limit.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { dispatchWhatsAppQueue } from "@/lib/whatsappSender.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/whatsapp/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["WHATSAPP_AUTOMATION_CRON_SECRET"];
        const provided =
          request.headers.get("x-automation-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey) return json({ error: "Server not configured" }, 500);

        const supabase = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        try {
          const result = await dispatchWhatsAppQueue(supabase);
          return json({ ok: !result.error, ...result });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Dispatch failed";
          console.error("WhatsApp dispatch failed:", message);
          return json({ ok: false, error: message }, 500);
        }
      },
    },
  },
});
