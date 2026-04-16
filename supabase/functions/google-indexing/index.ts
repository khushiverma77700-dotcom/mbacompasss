import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications";
const SITE_URL = "https://bschoolbuzz.com";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// Generate JWT for Google service account auth
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(payload)}`;

  // Import the private key
  const pemContent = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signingInput}.${sig}`;

  // Exchange JWT for access token
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function submitUrl(
  accessToken: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
) {
  const res = await fetch(`${INDEXING_API_URL}:publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type }),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    // Stats action doesn't need Google credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper to get SA + access token only when needed
    const getToken = async () => {
      const saJson = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT");
      if (!saJson) throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT not configured");
      let sa: ServiceAccount;
      try {
        sa = JSON.parse(saJson);
      } catch {
        throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT is not valid JSON. Please re-enter the full JSON credentials.");
      }
      return getAccessToken(sa);
    };

    // === ACTION: submit_url — submit a single URL ===
    if (action === "submit_url") {
      const { url, page_type, record_id } = body;
      if (!url) throw new Error("url is required");

      const accessToken = await getToken();
      const result = await submitUrl(accessToken, url);

      const status = result.ok ? "submitted" : "failed";
      const errorMessage = result.ok ? null : JSON.stringify(result.data);

      // Upsert into indexing_urls
      const now = new Date().toISOString();
      await supabase.from("indexing_urls").upsert(
        {
          url,
          page_type: page_type || "other",
          record_id: record_id || null,
          status,
          last_submitted_at: now,
          indexed_at: result.ok ? now : null,
          last_response: result.data,
          error_message: errorMessage,
          retry_count: 0,
        },
        { onConflict: "url" }
      );

      // Log
      const { data: urlRow } = await supabase
        .from("indexing_urls")
        .select("id")
        .eq("url", url)
        .single();

      if (urlRow) {
        await supabase.from("indexing_logs").insert({
          indexing_url_id: urlRow.id,
          action: "submit",
          status,
          response: result.data,
          error_message: errorMessage,
        });
      }

      return new Response(JSON.stringify({ success: result.ok, result: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: batch_submit — submit multiple URLs ===
    if (action === "batch_submit") {
      const urls: string[] = body.urls || [];
      if (!urls.length) throw new Error("urls array is required");

      const accessToken = await getToken();
      const results: any[] = [];

      for (const url of urls.slice(0, 100)) {
        try {
          const result = await submitUrl(accessToken, url);
          const status = result.ok ? "submitted" : "failed";
          const errorMessage = result.ok ? null : JSON.stringify(result.data);

          await supabase.from("indexing_urls").upsert(
            {
              url,
              page_type: "other",
              status,
              last_submitted_at: new Date().toISOString(),
              last_response: result.data,
              error_message: errorMessage,
            },
            { onConflict: "url" }
          );

          results.push({ url, success: result.ok, data: result.data });
        } catch (e: any) {
          results.push({ url, success: false, error: e.message });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: refresh — retry pending/failed URLs ===
    if (action === "refresh") {
      const { data: pendingUrls } = await supabase
        .from("indexing_urls")
        .select("*")
        .in("status", ["pending", "failed"])
        .lt("retry_count", 5)
        .order("created_at", { ascending: true })
        .limit(50);

      if (!pendingUrls?.length) {
        return new Response(JSON.stringify({ message: "No URLs to retry", count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getToken();
      let successCount = 0;

      for (const row of pendingUrls) {
        try {
          const result = await submitUrl(accessToken, row.url);
          const status = result.ok ? "submitted" : "failed";
          const errorMessage = result.ok ? null : JSON.stringify(result.data);

          await supabase
            .from("indexing_urls")
            .update({
              status,
              last_submitted_at: new Date().toISOString(),
              last_response: result.data,
              error_message: errorMessage,
              retry_count: row.retry_count + 1,
            })
            .eq("id", row.id);

          await supabase.from("indexing_logs").insert({
            indexing_url_id: row.id,
            action: "retry",
            status,
            response: result.data,
            error_message: errorMessage,
          });

          if (result.ok) successCount++;
        } catch (e: any) {
          await supabase
            .from("indexing_urls")
            .update({
              error_message: e.message,
              retry_count: row.retry_count + 1,
            })
            .eq("id", row.id);
        }
      }

      return new Response(
        JSON.stringify({ total: pendingUrls.length, success: successCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: discover — scan all content tables, register any new URLs ===
    if (action === "discover") {
      const tables = [
        { table: "articles", type: "article", pathFn: (r: any) => `/article/${r.slug}`, filter: { published: true } },
        { table: "institutes", type: "institute", pathFn: (r: any) => `/institute/${r.slug}` },
        { table: "colleges", type: "college", pathFn: (r: any) => `/college/${r.slug}` },
        { table: "exams", type: "exam", pathFn: (r: any) => `/exam/${r.slug}` },
        { table: "city_pages", type: "city_page", pathFn: (r: any) => `/colleges/${r.slug}`, filter: { active: true } },
      ];

      let newCount = 0;

      for (const t of tables) {
        let query = supabase.from(t.table).select("id, slug, name");
        if (t.filter) {
          for (const [k, v] of Object.entries(t.filter)) {
            query = query.eq(k, v);
          }
        }

        const { data: rows } = await query;
        if (!rows) continue;

        for (const row of rows) {
          if (!row.slug) continue;
          const url = `${SITE_URL}${t.pathFn(row)}`;

          const { data: existing } = await supabase
            .from("indexing_urls")
            .select("id")
            .eq("url", url)
            .maybeSingle();

          if (!existing) {
            await supabase.from("indexing_urls").insert({
              url,
              page_type: t.type,
              record_id: row.id,
              status: "pending",
            });
            newCount++;
          }
        }
      }

      return new Response(JSON.stringify({ discovered: newCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: stats — get summary counts ===
    if (action === "stats") {
      const { data: all } = await supabase.from("indexing_urls").select("status");
      const stats = { total: 0, submitted: 0, indexed: 0, failed: 0, pending: 0 };
      if (all) {
        stats.total = all.length;
        for (const r of all) {
          if (r.status === "submitted") stats.submitted++;
          else if (r.status === "indexed") stats.indexed++;
          else if (r.status === "failed") stats.failed++;
          else if (r.status === "pending") stats.pending++;
        }
      }
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    console.error("Google Indexing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
