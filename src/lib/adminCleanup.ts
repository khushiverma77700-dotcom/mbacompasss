import { supabase } from "@/integrations/supabase/client";

interface RemovedLink {
  url: string;
  label: string;
  type: string;
  deletedAt: string;
}

/**
 * When a page is deleted from any admin section, this function:
 * 1. Adds the link to "removed_links" in site_settings (for the SEO Dashboard section)
 * 2. Removes it from saved SEO snapshots
 * 3. Removes it from known SEO keys
 * 4. Triggers sitemap regeneration by marking it dirty
 */
export const cleanupDeletedPage = async (opts: {
  contentType: string;
  id: string;
  slug: string;
  name: string;
}) => {
  const { contentType, id, slug, name } = opts;

  // Determine URL path based on content type
  const urlMap: Record<string, string> = {
    article: `/article/${slug}`,
    institute: `/institute/${slug}`,
    college: `/college/${slug}`,
    exam: `/exam/${slug}`,
    category: `/category/${slug}`,
    cityPage: `/colleges/${slug}`,
  };
  const url = urlMap[contentType] || `/${slug}`;

  const removedLink: RemovedLink = {
    url,
    label: name,
    type: contentType,
    deletedAt: new Date().toISOString(),
  };

  try {
    // 1. Add to removed_links list
    const { data: existingRemoved } = await supabase
      .from("site_settings")
      .select("id, value")
      .eq("key", "removed_links")
      .maybeSingle();

    const currentRemoved: RemovedLink[] = existingRemoved?.value && Array.isArray(existingRemoved.value)
      ? (existingRemoved.value as unknown as RemovedLink[])
      : [];
    currentRemoved.push(removedLink);

    if (existingRemoved?.id) {
      await supabase.from("site_settings").update({ value: currentRemoved as unknown as Record<string, any> }).eq("id", existingRemoved.id);
    } else {
      await supabase.from("site_settings").insert({ key: "removed_links", value: currentRemoved as unknown as Record<string, any> });
    }

    // 2. Remove SEO snapshot for this page
    const seoKey = `seo_snapshot_${contentType}:${id}`;
    await supabase.from("site_settings").delete().eq("key", seoKey);

    // 3. Remove from known SEO keys
    const { data: knownKeysData } = await supabase
      .from("site_settings")
      .select("id, value")
      .eq("key", "seo_dashboard_known_keys")
      .maybeSingle();

    if (knownKeysData?.value && Array.isArray(knownKeysData.value)) {
      const keyToRemove = `${contentType}:${id}`;
      const updatedKeys = (knownKeysData.value as string[]).filter(k => k !== keyToRemove);
      await supabase.from("site_settings").update({ value: updatedKeys as unknown as Record<string, any> }).eq("id", knownKeysData.id);
    }

    // 4. Mark sitemap as dirty so next generation excludes this page
    await supabase.from("site_settings").upsert({
      key: "sitemap_dirty",
      value: JSON.stringify({ dirty: true, lastDeletedAt: new Date().toISOString() }),
    }, { onConflict: "key" });

  } catch (err) {
    console.error("Cleanup after deletion failed:", err);
  }
};

/**
 * Remove a link from the "removed_links" list permanently
 */
export const permanentlyRemoveLink = async (url: string) => {
  const { data } = await supabase
    .from("site_settings")
    .select("id, value")
    .eq("key", "removed_links")
    .maybeSingle();

  if (data?.value && Array.isArray(data.value)) {
    const updated = (data.value as unknown as RemovedLink[]).filter(l => l.url !== url);
    await supabase.from("site_settings").update({ value: updated as unknown as Record<string, any> }).eq("id", data.id);
  }
};

/**
 * Get all removed links
 */
export const getRemovedLinks = async (): Promise<RemovedLink[]> => {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "removed_links")
    .maybeSingle();

  if (data?.value && Array.isArray(data.value)) {
    return data.value as unknown as RemovedLink[];
  }
  return [];
};
