import { useSeoSnapshot, type SEOContentType } from "@/lib/seoAutomation";

interface ResolvedSeoInput {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

export const useResolvedSeo = (
  contentType?: SEOContentType,
  recordId?: string,
  baseSeo: ResolvedSeoInput = {},
) => {
  const { data: snapshot } = useSeoSnapshot(contentType, recordId);

  const snap = snapshot as any;

  // Resolve base JSON-LD (may be an array, object, or undefined)
  const rawBase = snap?.schemaMarkup || baseSeo.jsonLd;
  const baseArr: Record<string, any>[] = rawBase
    ? Array.isArray(rawBase) ? rawBase.filter(Boolean) : [rawBase]
    : [];

  // Deduplicate by @type — keep first occurrence of FAQPage / BreadcrumbList / etc.
  // Google flags duplicate FAQPage schemas as a critical error.
  const seenTypes = new Set<string>();
  const dedupedBase: Record<string, any>[] = [];
  for (const node of baseArr) {
    const t = (node as any)?.["@type"];
    const key = Array.isArray(t) ? t.join("|") : String(t || "");
    // Only dedupe singleton schema types that should never repeat per page
    const singletonTypes = new Set(["FAQPage", "BreadcrumbList", "WebPage", "Organization"]);
    if (key && singletonTypes.has(key)) {
      if (seenTypes.has(key)) continue;
      seenTypes.add(key);
    }
    dedupedBase.push(node);
  }

  // Only synthesize a FAQPage from snap.faqs if base does NOT already contain one
  const hasFaqPage = dedupedBase.some((n) => (n as any)?.["@type"] === "FAQPage");
  if (!hasFaqPage && Array.isArray(snap?.faqs) && snap.faqs.length > 0) {
    dedupedBase.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: snap.faqs.map((f: any) => ({
        "@type": "Question",
        name: f.question || f.q,
        acceptedAnswer: { "@type": "Answer", text: f.answer || f.a },
      })),
    });
  }

  const mergedJsonLd =
    dedupedBase.length === 0 ? undefined : dedupedBase.length === 1 ? dedupedBase[0] : dedupedBase;

  return {
    snapshot,
    seo: {
      title: snapshot?.meta_title || baseSeo.title,
      description: snapshot?.meta_description || baseSeo.description,
      keywords: snapshot?.keywords?.length ? snapshot.keywords : baseSeo.keywords,
      canonical:
        snapshot?.canonicalUrl ||
        (snapshot?.technicalSEO as Record<string, any> | undefined)?.canonicalUrl ||
        baseSeo.canonical,
      jsonLd: mergedJsonLd,
      ogImage: baseSeo.ogImage,
      ogTitle: snapshot?.socialMeta?.ogTitle || baseSeo.ogTitle || snapshot?.meta_title || baseSeo.title,
      ogDescription:
        snapshot?.socialMeta?.ogDescription ||
        baseSeo.ogDescription ||
        snapshot?.meta_description ||
        baseSeo.description,
      twitterTitle:
        snapshot?.socialMeta?.twitterTitle ||
        baseSeo.twitterTitle ||
        snapshot?.socialMeta?.ogTitle ||
        baseSeo.ogTitle ||
        snapshot?.meta_title ||
        baseSeo.title,
      twitterDescription:
        snapshot?.socialMeta?.twitterDescription ||
        baseSeo.twitterDescription ||
        snapshot?.socialMeta?.ogDescription ||
        baseSeo.ogDescription ||
        snapshot?.meta_description ||
        baseSeo.description,
    },
  };
};