/**
 * JSON-LD schema generators for the Profile Analyzer.
 * Returns Organization, optional LocalBusiness (when a city/state is known),
 * and an ItemList of related links for the current result context.
 */
import { SITE_URL, buildAnalyzerCanonical, seoSlugify } from "@/lib/seoUrlBuilder";

interface Ctx {
  exam?: string;
  city?: string;
  state?: string;
  course?: string;
  relatedExams?: string[];
  nearbyCities?: string[];
  popularCourses?: string[];
}

const organization = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MBA Compass",
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["English", "Hindi"],
  },
});

const localBusiness = (city: string, state?: string) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: `MBA Compass — ${city}`,
  url: buildAnalyzerCanonical({ city }),
  image: `${SITE_URL}/og-image.png`,
  address: {
    "@type": "PostalAddress",
    addressLocality: city,
    addressRegion: state || undefined,
    addressCountry: "IN",
  },
  areaServed: { "@type": "City", name: city },
  priceRange: "Free",
});

const itemList = (ctx: Ctx) => {
  const items: { name: string; url: string }[] = [];
  (ctx.relatedExams || []).forEach((e) =>
    items.push({
      name: `${e} profile analyser`,
      url: buildAnalyzerCanonical({ exam: e, city: ctx.city, course: ctx.course }),
    }),
  );
  (ctx.nearbyCities || []).forEach((c) =>
    items.push({
      name: `MBA chances from ${c}`,
      url: buildAnalyzerCanonical({ exam: ctx.exam, city: c, course: ctx.course }),
    }),
  );
  (ctx.popularCourses || []).forEach((c) =>
    items.push({
      name: `${c} MBA outlook`,
      url: buildAnalyzerCanonical({ exam: ctx.exam, city: ctx.city, course: c }),
    }),
  );
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Related MBA profile analyser pages",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
};

export const buildProfileAnalyzerSchemas = (ctx: Ctx) => {
  const schemas: Record<string, any>[] = [organization()];
  if (ctx.city) schemas.push(localBusiness(ctx.city, ctx.state));
  schemas.push(itemList(ctx));
  return schemas;
};
