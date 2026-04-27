import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!KEY_ID || !KEY_SECRET) throw new Error("Razorpay keys not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { bundle_id } = await req.json();
    if (!bundle_id) throw new Error("bundle_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: bundle, error: be } = await admin
      .from("mock_bundles")
      .select("id, name, price_inr, is_published")
      .eq("id", bundle_id)
      .maybeSingle();
    if (be || !bundle) throw new Error("Bundle not found");
    if (!bundle.is_published) throw new Error("Bundle not published");
    if (!bundle.price_inr || Number(bundle.price_inr) <= 0) throw new Error("Bundle has no price");

    const amount = Math.round(Number(bundle.price_inr) * 100);
    const receipt = `bundle_${bundle.id.slice(0, 8)}_${Date.now()}`.slice(0, 40);
    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount, currency: "INR", receipt,
        notes: { user_id: user.id, bundle_id: bundle.id, bundle_name: bundle.name },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) throw new Error(`Razorpay: ${JSON.stringify(order)}`);

    await admin.from("mock_bundle_orders").insert({
      user_id: user.id, bundle_id: bundle.id,
      razorpay_order_id: order.id, amount, currency: "INR", status: "created",
    });

    return new Response(JSON.stringify({
      order_id: order.id, amount, currency: "INR",
      key_id: KEY_ID, bundle_name: bundle.name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
