import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      throw new Error("Missing payment fields");

    const expected = createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) throw new Error("Invalid signature");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: oe } = await admin
      .from("mock_bundle_orders")
      .update({
        razorpay_payment_id, razorpay_signature,
        status: "paid", updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .select("id, bundle_id")
      .maybeSingle();
    if (oe || !order) throw new Error("Order not found");

    // Unlock all mocks in this bundle for the user
    const { error: ue } = await admin.rpc("unlock_bundle_mocks", {
      _user_id: user.id,
      _bundle_id: order.bundle_id,
    });
    if (ue) throw ue;

    // Tag the enrollment with the order
    await admin.from("mock_bundle_enrollments")
      .update({ order_id: order.id })
      .eq("user_id", user.id).eq("bundle_id", order.bundle_id);

    return new Response(JSON.stringify({ success: true, bundle_id: order.bundle_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
