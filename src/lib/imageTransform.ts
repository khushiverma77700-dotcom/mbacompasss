/**
 * Rewrites Supabase public Storage URLs through the on-the-fly image
 * transformer so we serve right-sized WebP instead of the original 1-2MB
 * upload. No-op for non-Supabase URLs.
 *
 *   /storage/v1/object/public/<bucket>/<path>
 *     →
 *   /storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q
 */
export function cdnImage(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return "";
  // Only rewrite Supabase public object URLs
  if (!/\/storage\/v1\/object\/public\//.test(url)) return url;
  const { width = 400, height, quality = 70 } = opts;
  const rendered = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const params = new URLSearchParams();
  params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("quality", String(quality));
  params.set("resize", "contain");
  return `${rendered}?${params.toString()}`;
}
