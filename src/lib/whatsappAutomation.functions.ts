// Admin-facing server functions for WhatsApp Automation.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Admins only");
}

export const runWhatsAppDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        campaignId: z.string().uuid().optional(),
        ignoreWindow: z.boolean().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { dispatchWhatsAppQueue } = await import("@/lib/whatsappSender.server");
    return dispatchWhatsAppQueue(supabaseAdmin, {
      ...(data.campaignId ? { campaignId: data.campaignId } : {}),
      ...(data.ignoreWindow ? { ignoreWindow: true } : {}),
    });
  });

export const getWhatsAppConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadWhatsAppConfig } = await import("@/lib/whatsappSender.server");
    const config = await loadWhatsAppConfig(supabaseAdmin);
    return {
      connected: config !== null,
      phoneNumberId: config ? config.phoneNumberId : null,
      baseUrl: config ? config.baseUrl : null,
    };
  });
