import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";
import { getCredential } from "../_shared/getCredential.ts";

Deno.serve(async (req) => {
  try {
    const SECRET = (await getCredential("RAZORPAY_WEBHOOK_SECRET"))!;
    const signature = req.headers.get("x-razorpay-signature") || "";
    const body = await req.text();

    const expected = createHmac("sha256", SECRET).update(body).digest("hex");
    if (expected !== signature) return new Response("Invalid signature", { status: 400 });

    const event = JSON.parse(body);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        const { data: order } = await admin
          .from("course_orders")
          .update({
            status: "paid",
            razorpay_payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId)
          .select("id, user_id, course_id")
          .maybeSingle();

        if (order) {
          const { data: course } = await admin
            .from("mba_compass_courses").select("validity_months").eq("id", order.course_id).maybeSingle();
          const months = course?.validity_months ?? 12;
          const expires = new Date();
          expires.setMonth(expires.getMonth() + months);
          await admin.from("course_enrollments").upsert({
            user_id: order.user_id, course_id: order.course_id,
            order_id: order.id, expires_at: expires.toISOString(),
          }, { onConflict: "user_id,course_id" });
        }
      }
    } else if (event.event === "payment.failed") {
      const payment = event.payload.payment?.entity;
      if (payment?.order_id) {
        await admin.from("course_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("razorpay_order_id", payment.order_id);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
