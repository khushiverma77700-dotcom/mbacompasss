import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY_ID = (await getCredential("RAZORPAY_KEY_ID"));
    const KEY_SECRET = (await getCredential("RAZORPAY_KEY_SECRET"));
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

    const { course_id } = await req.json();
    if (!course_id) throw new Error("course_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: course, error: ce } = await admin
      .from("mba_compass_courses")
      .select("id, title, price")
      .eq("id", course_id)
      .maybeSingle();
    if (ce || !course || !course.price) throw new Error("Course not found or no price");

    const amount = Math.round(Number(course.price) * 100);
    const receipt = `course_${course.id.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount, currency: "INR", receipt,
        notes: { user_id: user.id, course_id: course.id, course_name: course.title },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) throw new Error(`Razorpay: ${JSON.stringify(order)}`);

    await admin.from("course_orders").insert({
      user_id: user.id, course_id: course.id,
      razorpay_order_id: order.id, amount, currency: "INR", status: "created",
    });

    return new Response(JSON.stringify({
      order_id: order.id, amount, currency: "INR",
      key_id: KEY_ID, course_name: course.title,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
