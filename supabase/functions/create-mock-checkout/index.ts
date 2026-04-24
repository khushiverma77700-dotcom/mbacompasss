import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase: any = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json();
    const { testId, couponCode, returnUrl, environment } = body as {
      testId?: string;
      couponCode?: string;
      returnUrl?: string;
      environment?: StripeEnv;
    };

    if (!testId || !returnUrl) return json({ error: "Missing fields" }, 400);
    if (environment !== "sandbox" && environment !== "live") {
      return json({ error: "Invalid environment" }, 400);
    }

    // Load mock test
    const { data: test, error: testErr } = await supabase
      .from("mock_tests")
      .select("id, name, slug, price_inr, pricing_type, is_published, access_validity_days")
      .eq("id", testId)
      .single();
    if (testErr || !test) return json({ error: "Test not found" }, 404);
    if (!test.is_published) return json({ error: "Test not available" }, 400);
    if (test.pricing_type !== "paid" || Number(test.price_inr) <= 0) {
      return json({ error: "Test is free; no checkout needed" }, 400);
    }

    let amountInr = Number(test.price_inr);
    let discountInr = 0;
    let appliedCoupon: string | null = null;

    // Validate coupon if provided
    if (couponCode) {
      const code = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabase
        .from("mock_coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();

      if (coupon) {
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
        const usesOk = !coupon.max_uses || coupon.current_uses < coupon.max_uses;
        const scopeOk = !coupon.test_id || coupon.test_id === testId;
        const dateOk = (!validFrom || validFrom <= now) && (!validUntil || validUntil >= now);

        if (usesOk && scopeOk && dateOk) {
          if (coupon.discount_percent) {
            discountInr = Math.min(amountInr, (amountInr * Number(coupon.discount_percent)) / 100);
          } else if (coupon.discount_flat_inr) {
            discountInr = Math.min(amountInr, Number(coupon.discount_flat_inr));
          }
          amountInr = Math.max(0, amountInr - discountInr);
          appliedCoupon = code;
        }
      }
    }

    // Free after coupon → enroll directly
    if (amountInr <= 0) {
      const expiresAt = new Date(
        Date.now() + (test.access_validity_days || 30) * 24 * 60 * 60 * 1000,
      ).toISOString();
      await supabase.from("mock_enrollments").upsert(
        {
          user_id: user.id,
          test_id: testId,
          source: "coupon_free",
          coupon_code: appliedCoupon,
          expires_at: expiresAt,
        },
        { onConflict: "user_id,test_id" },
      );
      if (appliedCoupon) {
        const { data: c } = await supabase
          .from("mock_coupons")
          .select("current_uses")
          .eq("code", appliedCoupon)
          .maybeSingle();
        await supabase
          .from("mock_coupons")
          .update({ current_uses: ((c?.current_uses as number) || 0) + 1 })
          .eq("code", appliedCoupon);
      }
      return json({ free: true, enrolled: true });
    }

    const amountInPaise = Math.round(amountInr * 100);
    const stripe = createStripeClient(environment);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: test.name,
              description: `Mock Test Access (${test.access_validity_days} days)`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        testId,
        couponCode: appliedCoupon ?? "",
        discountInr: String(discountInr),
        amountInr: String(amountInr),
        validityDays: String(test.access_validity_days || 30),
      },
    });

    // Record pending payment
    await supabase.from("mock_payments").insert({
      user_id: user.id,
      test_id: testId,
      amount_inr: amountInr,
      currency: "inr",
      status: "pending",
      stripe_session_id: session.id,
      coupon_code: appliedCoupon,
      discount_inr: discountInr,
    });

    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-mock-checkout error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
