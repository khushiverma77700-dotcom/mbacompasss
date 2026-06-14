import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";

/**
 * Drop-in <img> wrapper that:
 *  - routes through cdnImage() + cdnImageSrcSet() for WebP + 2x DPR
 *  - reserves space via width/height + aspect-ratio so it never causes CLS
 *  - defaults to loading="lazy" + decoding="async" for below-the-fold thumbs
 *  - accepts `version` (e.g. row.updated_at) for stable cache-busting
 *  - set `priority` for the LCP image — flips loading=eager + fetchPriority=high
 *
 * Usage:
 *   <LazyImg src={inst.banner_url} alt={inst.name} width={600} height={400}
 *            sizes="(max-width: 768px) 100vw, 600px" version={inst.updated_at} />
 */
interface LazyImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading" | "src" | "srcSet"> {
  src: string | null | undefined;
  width: number;
  height: number;
  alt: string;
  quality?: number;
  sizes?: string;
  version?: string | number | null;
  priority?: boolean;
}

export const LazyImg = ({
  src,
  width,
  height,
  alt,
  quality = 72,
  sizes,
  version,
  priority = false,
  className,
  style,
  ...rest
}: LazyImgProps) => {
  const finalSrc = cdnImage(src, { width, quality, version });
  const finalSrcSet = cdnImageSrcSet(src, { width, quality, version });
  return (
    <img
      src={finalSrc}
      srcSet={finalSrcSet || undefined}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // @ts-expect-error — fetchpriority is valid HTML, lowercase in DOM
      fetchpriority={priority ? "high" : undefined}
      className={className}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
      {...rest}
    />
  );
};

export default LazyImg;
