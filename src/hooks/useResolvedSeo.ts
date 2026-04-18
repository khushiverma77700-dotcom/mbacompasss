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

  // Auto-inject FAQ schema if snapshot has FAQs
  const baseJsonLd = snap?.schemaMarkup || baseSeo.jsonLd;
  let mergedJsonLd = baseJsonLd;
  if (Array.isArray(snap?.faqs) && snap.faqs.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: snap.faqs.map((f: any) => ({
        "@type": "Question",
        name: f.question || f.q,
        acceptedAnswer: { "@type": "Answer", text: f.answer || f.a },
      })),
    };
    mergedJsonLd = baseJsonLd
      ? [...(Array.isArray(baseJsonLd) ? baseJsonLd : [baseJsonLd]), faqSchema]
      : faqSchema;
  }

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