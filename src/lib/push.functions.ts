// Browser push notifications for MBA Compass.
//
// register: stores a device token (works for signed-out visitors too, so it
// runs with the privileged client after validating the payload).
// send: admin-only broadcast through the Firebase Cloud Messaging gateway.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

const registerSchema = z.object({
  token: z.string().min(20).max(4096),
  userId: z.string().uuid().nullable().optional(),
  userAgent: z.string().max(400).nullable().optional(),
  pagePath: z.string().max(300).nullable().optional(),
});

export const registerPushToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscribers").upsert(
      {
        token: data.token,
        user_id: data.userId ?? null,
        user_agent: data.userAgent ?? null,
        page_path: data.pagePath ?? null,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const sendSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(400).optional().default(""),
  linkUrl: z.string().max(500).optional().default(""),
  imageUrl: z.string().max(500).optional().default(""),
  audience: z.enum(["all", "signed_in"]).optional().default("all"),
});

type SendResult = {
  sent: number;
  failed: number;
  devices: number;
  error?: string;
};

export const sendPushBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }): Promise<SendResult> => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (roleError) throw new Error(roleError.message);
    if (!roles || roles.length === 0) throw new Error("Admins only");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connectionKey) {
      return {
        sent: 0,
        failed: 0,
        devices: 0,
        error:
          "Browser notifications are not connected yet. Connect the notification service from the Lovable chat, then send again.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("push_subscribers")
      .select("id, token, user_id")
      .eq("is_active", true)
      .limit(5000);
    if (data.audience === "signed_in") query = query.not("user_id", "is", null);
    const { data: devices, error: deviceError } = await query;
    if (deviceError) throw new Error(deviceError.message);

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    let lastError = "";

    for (const device of devices ?? []) {
      const payload = {
        message: {
          token: device.token,
          notification: {
            title: data.title,
            body: data.body || "",
            ...(data.imageUrl ? { image: data.imageUrl } : {}),
          },
          data: data.linkUrl ? { path: data.linkUrl } : {},
          webpush: data.linkUrl
            ? { fcm_options: { link: data.linkUrl } }
            : {},
        },
      };
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          sent += 1;
        } else {
          failed += 1;
          const text = await res.text();
          lastError = `[${res.status}] ${text}`.slice(0, 500);
          if (res.status === 404 || res.status === 400) stale.push(device.id);
        }
      } catch (e) {
        failed += 1;
        lastError = e instanceof Error ? e.message : "Unknown send failure";
      }
    }

    if (stale.length > 0) {
      await supabaseAdmin.from("push_subscribers").update({ is_active: false }).in("id", stale);
    }

    await supabaseAdmin.from("push_broadcasts").insert({
      title: data.title,
      body: data.body || null,
      link_url: data.linkUrl || null,
      image_url: data.imageUrl || null,
      audience: data.audience,
      sent_count: sent,
      failed_count: failed,
      status: sent > 0 ? "sent" : "failed",
      error_text: lastError || null,
      created_by: context.userId,
    });

    return {
      sent,
      failed,
      devices: devices?.length ?? 0,
      ...(sent === 0 && lastError ? { error: lastError } : {}),
    };
  });
