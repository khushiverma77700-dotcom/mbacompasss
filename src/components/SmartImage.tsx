import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";

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
  const [meta, setMeta] = useState<ImageAssetRow | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => { void lookup(src).then(row => { if (alive) setMeta(row); }); };
    setMeta(null);
    if (eager || !ref.current || typeof IntersectionObserver === "undefined") { load(); return () => { alive = false; }; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { load(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => { alive = false; observer.disconnect(); };
  }, [src, eager]);

  const resolvedAlt = meta?.alt || alt;
  const resolvedWidth = width ?? meta?.width ?? undefined;
  const resolvedHeight = height ?? meta?.height ?? undefined;
  const webp = meta?.variants?.webp;
  const avif = meta?.variants?.avif;
  const options = { width: Number(width) || meta?.width || 640, quality: 75 };

  const commonImg = (
    <img
      ref={ref}
      src={cdnImage(src, options)}
      srcSet={cdnImageSrcSet(src, options) || undefined}
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

  if (!webp && !avif) return commonImg;
  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} />}
      {webp && <source type="image/webp" srcSet={webp} />}
      {commonImg}
    </picture>
  );
};

export default SmartImage;
