import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listing_id, action, admin_notes } = await req.json();
    if (!listing_id || !action) {
      return new Response(JSON.stringify({ error: "listing_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: listing, error: lErr } = await admin
      .from("user_listings")
      .select("*")
      .eq("id", listing_id)
      .maybeSingle();

    if (lErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject / changes_requested — just update status
    if (action === "reject" || action === "request_changes") {
      const newStatus = action === "reject" ? "rejected" : "changes_requested";
      await admin
        .from("user_listings")
        .update({ status: newStatus, admin_notes: admin_notes || null })
        .eq("id", listing_id);
      return new Response(JSON.stringify({ ok: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "approve") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ APPROVE: merge into live tables ============
    const payload = (listing.payload || {}) as any;
    const type = listing.listing_type as "coaching" | "college";
    const baseSlug = slugify(payload.name || "listing");

    // Ensure unique slug
    const ensureUniqueSlug = async (table: "colleges" | "institutes", base: string) => {
      let slug = base || `listing-${Date.now()}`;
      let i = 2;
      while (true) {
        const { data } = await admin.from(table).select("id").eq("slug", slug).maybeSingle();
        if (!data) return slug;
        slug = `${base}-${i++}`;
      }
    };

    let liveId: string | null = null;
    let liveSlug: string | null = null;

    if (type === "coaching") {
      const slug = await ensureUniqueSlug("institutes", baseSlug);
      const insertRow: any = {
        name: payload.name,
        slug,
        description: payload.description || null,
        city: payload.city || null,
        state: payload.state || null,
        address: payload.address || null,
        mode: payload.mode || "Offline",
        category_id: payload.category_id || null,
        specializations: payload.specializations || [],
        phone: payload.phone || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        website: payload.website || null,
        discount: payload.discount || null,
        offer: payload.offer || null,
        features: payload.features || [],
        fees_lakhs: payload.fees_lakhs || null,
        logo_url: payload.logo_url || null,
        banner_url: payload.banner_url || null,
        meta_title: payload.meta_title || null,
        meta_description: payload.meta_description || null,
        keywords: payload.keywords || [],
        primary_keyword: payload.primary_keyword || null,
        submitted_by_user_id: listing.user_id,
        source: "user",
        last_updated_by: "user",
      };
      const { data: ins, error: insErr } = await admin
        .from("institutes")
        .insert(insertRow)
        .select("id, slug")
        .single();
      if (insErr) throw insErr;
      liveId = ins.id;
      liveSlug = ins.slug;

      // Nested: courses
      if (Array.isArray(payload.courses_list) && payload.courses_list.length) {
        const rows = payload.courses_list
          .filter((c: any) => c?.name)
          .map((c: any) => ({
            institute_id: liveId,
            name: c.name,
            duration: c.duration || null,
            mode: c.mode || "Offline",
            fees: c.fees ? Number(c.fees) || null : null,
            description: c.description || null,
          }));
        if (rows.length) await admin.from("courses").insert(rows);
      }

      // Nested: faculty
      if (Array.isArray(payload.faculty_list) && payload.faculty_list.length) {
        const rows = payload.faculty_list
          .filter((f: any) => f?.name)
          .map((f: any) => ({
            institute_id: liveId,
            name: f.name,
            designation: f.designation || null,
            qualification: f.qualification || null,
            experience: f.experience || null,
            specialization: f.specialization || null,
            bio: f.bio || null,
            photo_url: f.photo_url || null,
          }));
        if (rows.length) await admin.from("faculty").insert(rows);
      }

      // Nested: results
      if (Array.isArray(payload.results_list) && payload.results_list.length) {
        const rows = payload.results_list
          .filter((r: any) => r?.college_name && r?.year)
          .map((r: any) => ({
            institute_id: liveId,
            year: Number(r.year),
            college_name: r.college_name,
            students_selected: Number(r.students_selected) || 0,
            description: r.description || null,
          }));
        if (rows.length) await admin.from("institute_results").insert(rows);
      }
    } else {
      // college
      const slug = await ensureUniqueSlug("colleges", baseSlug);
      const insertRow: any = {
        name: payload.name,
        slug,
        description: payload.description || null,
        city: payload.city || null,
        state: payload.state || null,
        type: payload.type || "Private",
        tier: payload.tier || "Tier 2",
        college_category: payload.college_category || "Non-IIM",
        established: payload.established || null,
        ranking: payload.ranking || null,
        courses: payload.courses || [],
        specializations: payload.specializations || [],
        exams_accepted: payload.exams_accepted || [],
        accreditations: payload.accreditations || [],
        fees: payload.fees || null,
        fees_lakhs: payload.fees_lakhs || null,
        placement_avg: payload.placement_avg || null,
        placement_median: payload.placement_median || null,
        placement_highest: payload.placement_highest || null,
        top_recruiters: payload.top_recruiters || [],
        total_students: payload.total_students || null,
        campus_size: payload.campus_size || null,
        website: payload.website || null,
        admission_process: payload.admission_process || null,
        logo_url: payload.logo_url || null,
        banner_url: payload.banner_url || null,
        meta_title: payload.meta_title || null,
        meta_description: payload.meta_description || null,
        keywords: payload.keywords || [],
        primary_keyword: payload.primary_keyword || null,
        submitted_by_user_id: listing.user_id,
        source: "user",
        last_updated_by: "user",
      };
      const { data: ins, error: insErr } = await admin
        .from("colleges")
        .insert(insertRow)
        .select("id, slug")
        .single();
      if (insErr) throw insErr;
      liveId = ins.id;
      liveSlug = ins.slug;
    }

    // Mark listing approved
    await admin
      .from("user_listings")
      .update({
        status: "approved",
        admin_notes: admin_notes || null,
        approved_record_id: liveId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", listing_id);

    return new Response(
      JSON.stringify({ ok: true, status: "approved", live_id: liveId, slug: liveSlug }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("approve-user-listing error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
