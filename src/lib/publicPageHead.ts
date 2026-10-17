import { canonicalUrl } from "./canonical";
import { fitTitle } from "./collegeSeo";
import { cdnImage } from "./imageTransform";

export const cleanSeoText = (value: unknown, max: number): string => {
  const text = String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

/** Route metadata owns the first response and hydration; legacy SEOHead must not replace it. */
export function publicPageHead(path: string, rawTitle: string, rawDescription: string, image?: string, type = "website") {
  const title = fitTitle(rawTitle, 59);
  const description = cleanSeoText(rawDescription, 154);
  const url = canonicalUrl(path);
  const validImage = image?.startsWith("https://") ? cdnImage(image, { width: 1200, height: 630, quality: 75 }) : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "mba-route-seo", content: "true" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { name: "twitter:card", content: validImage ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(validImage ? [{ property: "og:image", content: validImage }, { name: "twitter:image", content: validImage }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: path === "/" ? [] : [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
        ...(path.startsWith("/tools/") ? [{ "@type": "ListItem", position: 2, name: "Tools", item: canonicalUrl("/tools") }] : []),
        { "@type": "ListItem", position: path.startsWith("/tools/") ? 3 : 2, name: title.split("|")[0].trim(), item: url },
      ],
    }) }],
  };
}

export function privatePageHead(path: string, title: string, description: string) {
  const head = publicPageHead(path, title, description);
  return { ...head, meta: [...head.meta, { name: "robots", content: "noindex, nofollow" }] };
}