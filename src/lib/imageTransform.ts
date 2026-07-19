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
  opts: { width?: number; height?: number; quality?: number; dpr?: number; version?: string | number | null } = {}
): string {
  if (!url) return "";
  const { width = 400, height, quality = 70, dpr = 1, version } = opts;

  // Unsplash on-the-fly transformer: request the exact size + WebP so
  // 1200px-wide originals aren't shipped when we render a 170px card.
  if (/images\.unsplash\.com\//.test(url)) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", String(Math.round(width * dpr)));
      if (height) u.searchParams.set("h", String(Math.round(height * dpr)));
      u.searchParams.set("q", String(quality));
      u.searchParams.set("fm", "webp");
      u.searchParams.set("auto", "format,compress");
      if (!u.searchParams.get("fit")) u.searchParams.set("fit", "crop");
      return u.toString();
    } catch { return url; }
  }

  // Only rewrite Supabase public object URLs
  if (!/\/storage\/v1\/object\/public\//.test(url)) return url;
  const rendered = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const params = new URLSearchParams();
  params.set("width", String(Math.round(width * dpr)));
  if (height) params.set("height", String(Math.round(height * dpr)));
  params.set("quality", String(quality));
  params.set("resize", "contain");
  // Cache-busting key: when an image is replaced in storage its URL is the same,
  // so we append a stable `v=` derived from the row's updated_at. CDN/browser
  // can cache aggressively (1y immutable) keyed by this URL — bumped only when
  // the underlying file actually changes.
  if (version !== undefined && version !== null && version !== "") {
    const v = typeof version === "string" ? version.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) : String(version);
    if (v) params.set("v", v);
  }
  return `${rendered}?${params.toString()}`;
}


/**
 * Returns a `srcset` string with 1x and 2x DPR variants so retina screens
 * load sharper images without ballooning bytes on standard displays.
 * Use together with `cdnImage(...)` as the `src` fallback and a `sizes` attr.
 *
 *   <img
 *     src={cdnImage(url, { width: 400 })}
 *     srcSet={cdnImageSrcSet(url, { width: 400 })}
 *     sizes="(max-width: 768px) 100vw, 400px"
 *   />
 */
export function cdnImageSrcSet(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; version?: string | number | null } = {}
): string {
  if (!url) return "";
  if (!/\/storage\/v1\/object\/public\//.test(url)) return "";
  const { width = 400 } = opts;
  return [
    `${cdnImage(url, { ...opts, dpr: 1 })} ${width}w`,
    `${cdnImage(url, { ...opts, dpr: 2 })} ${width * 2}w`,
  ].join(", ");
}

