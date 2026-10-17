import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const resolvePluralCollege = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(250) }))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const url = process.env['SUPABASE_URL'];
    if (!key || !url) throw new Error("Public directory unavailable");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const { data: college, error } = await db.from("colleges").select("slug").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error("Public directory unavailable");
    if (college?.slug) return `/college/${encodeURIComponent(college.slug)}`;
    const { data: city, error: cityError } = await db.from("city_pages").select("name,state,type").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (cityError) throw new Error("Public locations unavailable");
    if (!city?.name) return null;
    const search = new URLSearchParams(city.type === "state" ? { state: city.name } : { city: city.name, ...(city.state ? { state: city.state } : {}) });
    return `/colleges?${search}`;
  });