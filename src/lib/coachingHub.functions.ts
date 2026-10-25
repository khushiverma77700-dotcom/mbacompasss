import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const readCoachingRegion = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const url = process.env['SUPABASE_URL'];
    if (!key || !url) throw new Error("Coaching directory unavailable");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const [institute, region] = await Promise.all([
      db.from("institutes").select("slug").eq("slug", data.slug).maybeSingle(),
      db.from("city_pages").select("name,type,state,city_aliases").eq("slug", data.slug).eq("active", true).maybeSingle(),
    ]);
    if (institute.error) throw institute.error;
    if (region.error) throw region.error;
    return { instituteSlug: institute.data?.slug, region: region.data };
  });