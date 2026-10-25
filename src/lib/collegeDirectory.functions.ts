import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { collegeLocationSlug } from "./collegeHub";
import { DIRECTORY_PAGE_SIZE } from "./directoryPagination";

export const readCollegeDirectoryPage = createServerFn({ method: "GET" })
  .inputValidator(z.object({ page: z.number().int().min(1).max(10000), kind: z.enum(["all", "city", "state", "type", "exam"]), slug: z.string().max(200).default("") }))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const url = process.env['SUPABASE_URL'];
    if (!key || !url) throw new Error("Public college directory unavailable");
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    let query = db.rpc("colleges_listing", {}, { count: "exact" });
    let locations: { city: string; state: string; total: number }[] = [];
    if (data.kind === "city" || data.kind === "state") {
      const result = await db.rpc("colleges_location_counts");
      if (result.error) throw result.error;
      locations = result.data || [];
      const names = [...new Set(locations.map(row => row[data.kind as "city" | "state"]).filter(name => collegeLocationSlug(name || "") === data.slug))];
      if (!names.length) return { rows: [], total: 0, name: data.slug, cities: [] as string[] };
      query = query.in(data.kind, names);
    } else if (data.kind !== "all") {
      throw new Error("Unsupported paginated directory");
    }
    const from = (data.page - 1) * DIRECTORY_PAGE_SIZE;
    const result = await query.order("listing_sort_order", { nullsFirst: false }).order("ranking", { nullsFirst: false }).order("id").range(from, from + DIRECTORY_PAGE_SIZE - 1);
    if (result.error?.code === "PGRST103") return { rows: [], total: 0, name: data.slug, cities: [] as string[] };
    if (result.error) throw result.error;
    const rows = result.data || [];
    const cities = data.kind === "state" ? [...new Set(locations.filter(row => collegeLocationSlug(row.state || "") === data.slug).map(row => row.city).filter(Boolean))] : [];
    return { rows, total: result.count ?? rows.length, name: rows[0]?.[data.kind === "state" ? "state" : "city"] || data.slug, cities };
  });