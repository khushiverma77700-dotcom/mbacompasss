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
      .from("course_orders")
      .update({
        razorpay_payment_id, razorpay_signature,
        status: "paid", updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .select("id, course_id")
      .maybeSingle();
    if (oe || !order) throw new Error("Order not found");

    const { data: course } = await admin
      .from("mba_compass_courses").select("validity_months").eq("id", order.course_id).maybeSingle();
    const months = course?.validity_months ?? 12;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);

    await admin.from("course_enrollments").upsert({
      user_id: user.id, course_id: order.course_id,
      order_id: order.id, expires_at: expires.toISOString(),
    }, { onConflict: "user_id,course_id" });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
