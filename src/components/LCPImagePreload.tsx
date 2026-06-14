import { useEffect } from "react";
import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";

/**
 * Injects a high-priority `<link rel="preload" as="image">` into <head> for
 * the LCP image of a page (e.g. category hero, blog featured image).
 *
 * Use it ONCE per page, as close to the top of the component tree as possible:
 *
 *   <LCPImagePreload src={cityPage.hero_image_url} width={1280} version={cityPage.updated_at} />
 *
 * It's a no-op when src is falsy, so it's safe to call before data loads.
 */
interface Props {
  src: string | null | undefined;
  width: number;
  quality?: number;
  version?: string | number | null;
  sizes?: string;
}

export const LCPImagePreload = ({ src, width, quality = 75, version, sizes = "100vw" }: Props) => {
  useEffect(() => {
    if (!src) return;
    const href = cdnImage(src, { width, quality, version });
    if (!href) return;
    const imagesrcset = cdnImageSrcSet(src, { width, quality, version });

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    if (imagesrcset) {
      link.setAttribute("imagesrcset", imagesrcset);
      link.setAttribute("imagesizes", sizes);
    }
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch { /* noop */ }
    };
  }, [src, width, quality, version, sizes]);

  return null;
};

export default LCPImagePreload;
