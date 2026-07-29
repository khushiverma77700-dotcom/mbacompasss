import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";

// In-memory cache keyed by source URL — one lookup per URL per session, not per render.
const cache = new Map<string, ImageAssetRow | null>();
const pending = new Map<string, Promise<ImageAssetRow | null>>();

interface ImageAssetRow {
  alt: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
  variants: Record<string, string> | null;
}

async function lookup(url: string): Promise<ImageAssetRow | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  const existing = pending.get(url);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { data } = await supabase
        .from("image_assets")
        .select("alt, title, width, height, variants")
        .eq("source_url", url)
        .maybeSingle();
      cache.set(url, (data as ImageAssetRow) ?? null);
      return (data as ImageAssetRow) ?? null;
    } catch {
      cache.set(url, null);
      return null;
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, p);
  return p;
}

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  src: string;
  alt: string; // Callers still declare an alt so a11y works before hydration.
  eager?: boolean;
}

/**
 * Drop-in replacement for <img> that:
 * - Serves a <picture> with a WebP <source> when an optimized variant exists.
 * - Injects intrinsic width/height (from image_assets) to eliminate CLS.
 * - Lazy-loads by default; eager=true for the LCP image.
 * - Never changes visual size — layout is still governed by the parent CSS.
 */
export const SmartImage = ({ src, alt, eager, width, height, ...rest }: SmartImageProps) => {
  const [meta, setMeta] = useState<ImageAssetRow | null>(() => cache.get(src) ?? null);

  useEffect(() => {
    let alive = true;
    if (!cache.has(src)) {
      lookup(src).then((row) => { if (alive) setMeta(row); });
    } else {
      setMeta(cache.get(src) ?? null);
    }
    return () => { alive = false; };
  }, [src]);

  const resolvedAlt = meta?.alt || alt;
  const resolvedWidth = width ?? meta?.width ?? undefined;
  const resolvedHeight = height ?? meta?.height ?? undefined;
  const webp = meta?.variants?.webp;

  const commonImg = (
    <img
      src={src}
      alt={resolvedAlt}
      title={meta?.title ?? undefined}
      width={resolvedWidth as any}
      height={resolvedHeight as any}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      {...rest}
    />
  );

  if (!webp) return commonImg;
  return (
    <picture>
      <source type="image/webp" srcSet={webp} />
      {commonImg}
    </picture>
  );
};

export default SmartImage;
