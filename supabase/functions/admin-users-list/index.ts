import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth token" });

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json(403, { error: "Admin only" });

  try {
    const [
      profilesRes, mockEnrRes, bundleEnrRes, courseEnrRes,
      mockTestsRes, bundlesRes, coursesRes,
      bundleOrdersRes, courseOrdersRes, mockOrdersRes, purchaseOrdersRes,
    ] = await Promise.all([
      admin.from("profiles").select("user_id, display_name, phone, created_at"),
      admin.from("mock_enrollments").select("user_id, test_id, source, enrolled_at").order("enrolled_at", { ascending: true }),
      admin.from("mock_bundle_enrollments").select("user_id, bundle_id, enrolled_at").order("enrolled_at", { ascending: true }),
      admin.from("course_enrollments").select("user_id, course_id, enrolled_at").order("enrolled_at", { ascending: true }),
      admin.from("mock_tests").select("id, name"),
      admin.from("mock_bundles").select("id, name"),
      admin.from("mba_compass_courses").select("id, title"),
      admin.from("mock_bundle_orders").select("user_id, bundle_id, status, amount, created_at"),
      admin.from("course_orders").select("user_id, course_id, status, amount, created_at"),
      admin.from("mock_orders").select("user_id, status, final_amount, created_at"),
      admin.from("mock_purchase_orders").select("user_id, buyer_email, buyer_name, buyer_phone, product_name, test_id, bundle, status, amount, created_at"),
    ]);

    const testMap = new Map((mockTestsRes.data ?? []).map((r: any) => [r.id, r.name]));
    const bundleMap = new Map((bundlesRes.data ?? []).map((r: any) => [r.id, r.name]));
    const courseMap = new Map((coursesRes.data ?? []).map((r: any) => [r.id, r.title]));

    type Purchase = { label: string; kind: string; date: string; status?: string; amount?: number | null };
    type Agg = {
      user_id: string;
      display_name: string;
      phone: string | null;
      email: string;
      profile_created_at: string | null;
      purchases: Purchase[];
      first_enrolled_at: string | null;
      banned_until: string | null;
    };

    const map = new Map<string, Agg>();
    const ensure = (uid: string): Agg => {
      let a = map.get(uid);
      if (!a) {
        a = { user_id: uid, display_name: "", phone: null, email: "", profile_created_at: null, purchases: [], first_enrolled_at: null, banned_until: null };
        map.set(uid, a);
      }
      return a;
    };

    for (const p of profilesRes.data ?? []) {
      const a = ensure(p.user_id);
      a.display_name = p.display_name ?? "";
      a.phone = p.phone ?? null;
      a.profile_created_at = p.created_at ?? null;
    }

    const bumpDate = (a: Agg, d?: string | null) => {
      if (!d) return;
      if (!a.first_enrolled_at || new Date(d) < new Date(a.first_enrolled_at)) a.first_enrolled_at = d;
    };

    // --- Enrollments (actual access granted) ---
    for (const r of mockEnrRes.data ?? []) {
      if (r.source === "universal_student_access") continue;
      if (r.source === "admin") continue; // admin-granted, not a purchase
      const a = ensure(r.user_id);
      a.purchases.push({ label: testMap.get(r.test_id) ?? "Mock Test", kind: "mock", date: r.enrolled_at, status: "enrolled" });
      bumpDate(a, r.enrolled_at);
    }
    for (const r of bundleEnrRes.data ?? []) {
      const a = ensure(r.user_id);
      a.purchases.push({ label: bundleMap.get(r.bundle_id) ?? "Bundle", kind: "bundle", date: r.enrolled_at, status: "enrolled" });
      bumpDate(a, r.enrolled_at);
    }
    for (const r of courseEnrRes.data ?? []) {
      const a = ensure(r.user_id);
      a.purchases.push({ label: courseMap.get(r.course_id) ?? "Course", kind: "course", date: r.enrolled_at, status: "enrolled" });
      bumpDate(a, r.enrolled_at);
    }

    // --- Orders (include buyers even if enrollment wasn't provisioned) ---
    for (const r of bundleOrdersRes.data ?? []) {
      if (!r.user_id) continue;
      const a = ensure(r.user_id);
      a.purchases.push({ label: bundleMap.get(r.bundle_id) ?? "Bundle", kind: "bundle", date: r.created_at, status: r.status, amount: r.amount });
      bumpDate(a, r.created_at);
    }
    for (const r of courseOrdersRes.data ?? []) {
      if (!r.user_id) continue;
      const a = ensure(r.user_id);
      a.purchases.push({ label: courseMap.get(r.course_id) ?? "Course", kind: "course", date: r.created_at, status: r.status, amount: r.amount });
      bumpDate(a, r.created_at);
    }
    for (const r of mockOrdersRes.data ?? []) {
      if (!r.user_id) continue;
      const a = ensure(r.user_id);
      a.purchases.push({ label: "Mock Order", kind: "mock", date: r.created_at, status: r.status, amount: r.final_amount });
      bumpDate(a, r.created_at);
    }
    // Guest checkout orders — may not have user_id yet; key by email if available
    const guestOrders: any[] = [];
    for (const r of purchaseOrdersRes.data ?? []) {
      const label = r.product_name || (r.test_id ? (testMap.get(r.test_id) ?? "Mock Test") : (r.bundle ? (bundleMap.get(r.bundle) ?? "Bundle") : "Mock Purchase"));
      if (r.user_id) {
        const a = ensure(r.user_id);
        a.purchases.push({ label, kind: r.bundle ? "bundle" : "mock", date: r.created_at, status: r.status, amount: r.amount });
        bumpDate(a, r.created_at);
      } else if (r.buyer_email) {
        guestOrders.push({ ...r, label });
      }
    }

    const wantedIds = Array.from(map.values()).filter((a) => a.purchases.length > 0).map((a) => a.user_id);
    const wantedSet = new Set(wantedIds);

    // Fetch emails + banned_until via admin.listUsers (paged)
    const emailToId = new Map<string, string>();
    let page = 1;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      for (const u of data.users) {
        if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
        if (!wantedSet.has(u.id)) continue;
        const a = map.get(u.id)!;
        a.email = u.email ?? "";
        // @ts-ignore banned_until is present on the user object
        a.banned_until = (u as any).banned_until ?? null;
        if (!a.profile_created_at) a.profile_created_at = u.created_at;
      }
      if (!data.users.length || data.users.length < 1000) break;
      page += 1;
    }

    // Attach guest orders to matching auth users by email; otherwise surface as guest rows
    const guestRows: any[] = [];
    for (const r of guestOrders) {
      const uid = emailToId.get((r.buyer_email as string).toLowerCase());
      if (uid) {
        const a = ensure(uid);
        if (!a.email) a.email = r.buyer_email;
        if (!a.display_name) a.display_name = r.buyer_name ?? "";
        if (!a.phone) a.phone = r.buyer_phone ?? null;
        a.purchases.push({ label: r.label, kind: r.bundle ? "bundle" : "mock", date: r.created_at, status: r.status, amount: r.amount });
        bumpDate(a, r.created_at);
        wantedSet.add(uid);
      } else {
        guestRows.push({
          user_id: null,
          display_name: r.buyer_name ?? (r.buyer_email?.split("@")[0] ?? "Guest"),
          email: r.buyer_email,
          phone: r.buyer_phone ?? null,
          purchases: [{ label: r.label, kind: r.bundle ? "bundle" : "mock", date: r.created_at, status: r.status, amount: r.amount }],
          purchase_count: 1,
          first_enrolled_at: r.created_at,
          status: r.status === "paid" ? "guest_paid" : "guest",
        });
      }
    }

    const finalIds = Array.from(map.values()).filter((a) => a.purchases.length > 0).map((a) => a.user_id);
    const rows = finalIds.map((id) => {
      const a = map.get(id)!;
      const seen = new Set<string>();
      const uniq = a.purchases
        .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
        .filter((p) => {
          const k = `${p.kind}:${p.label}`;
          return seen.has(k) ? false : (seen.add(k), true);
        });
      const banned = a.banned_until && new Date(a.banned_until).getTime() > Date.now();
      return {
        user_id: a.user_id,
        display_name: a.display_name || (a.email?.split("@")[0] ?? ""),
        email: a.email,
        phone: a.phone,
        purchases: uniq,
        purchase_count: uniq.length,
        first_enrolled_at: a.first_enrolled_at,
        status: banned ? "blocked" : "active",
      };
    }).concat(guestRows)
      .sort((x, y) => new Date(y.first_enrolled_at ?? 0).getTime() - new Date(x.first_enrolled_at ?? 0).getTime());

    return json(200, { users: rows });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "Failed" });
  }
});
