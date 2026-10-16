import { canonicalUrl } from "./canonical";
import { fitTitle } from "./collegeSeo";

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
  const validImage = image?.startsWith("https://") ? image : undefined;
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
  };
}