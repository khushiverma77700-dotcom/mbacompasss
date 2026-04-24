import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const supabase = getSupabase();
  const meta = session.metadata || {};
  const userId = meta.userId;
  const testId = meta.testId;
  const couponCode = meta.couponCode || null;
  const validityDays = parseInt(meta.validityDays || "30", 10);

  if (!userId || !testId) {
    console.error("Missing userId/testId in session metadata", session.id);
    return;
  }

  // Mark payment paid
  await supabase
    .from("mock_payments")
    .update({
      status: "paid",
      stripe_payment_intent: session.payment_intent || null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  // Create enrollment
  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("mock_enrollments").upsert(
    {
      user_id: userId,
      test_id: testId,
      source: "stripe",
      coupon_code: couponCode || null,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,test_id" },
  );

  // Increment coupon usage
  if (couponCode) {
    const { data: c } = await supabase
      .from("mock_coupons")
      .select("current_uses")
      .eq("code", couponCode)
      .maybeSingle();
    if (c) {
      await supabase
        .from("mock_coupons")
        .update({ current_uses: (c.current_uses || 0) + 1 })
        .eq("code", couponCode);
    }
  }
}

async function handlePaymentFailed(session: any) {
  await getSupabase()
    .from("mock_payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", session.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv as StripeEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
