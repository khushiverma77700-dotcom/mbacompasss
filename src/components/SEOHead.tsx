import { useEffect } from "react";

const SITE_URL = "https://bestmbacoaching.com";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
}

const SEOHead = ({
  title,
  description,
  keywords,
  canonical,
  jsonLd,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  noIndex,
}: SEOHeadProps) => {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) setMeta("description", description);
    if (keywords?.length) setMeta("keywords", keywords.join(", "));

    // Open Graph
    if (title) setMeta("og:title", title, "property");
    if (description) setMeta("og:description", description, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    setMeta("og:site_name", "Best MBA Coaching", "property");
    setMeta("og:type", ogType, "property");
    if (canonical) setMeta("og:url", canonical, "property");

    // Twitter Card
    setMeta("twitter:card", twitterCard);
    if (title) setMeta("twitter:title", title);
    if (description) setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);

    // Robots
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    }

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // JSON-LD — support single or array of schemas
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld]');
    existingScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      schemas.forEach((schema, i) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-jsonld", String(i));
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }

    return () => {
      const scripts = document.querySelectorAll('script[data-seo-jsonld]');
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, keywords, canonical, jsonLd, ogImage, ogType, twitterCard, noIndex]);

  return null;
};

export default SEOHead;

// ==========================================
// JSON-LD Schema Generators
// ==========================================

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Best MBA Coaching",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Best MBA Coaching",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["English", "Hindi"],
  },
});

export const generateArticleSchema = (article: any) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.meta_title || article.title,
  description: article.meta_description || article.excerpt || "",
  author: { "@type": "Person", name: article.author || "Best MBA Coaching Team" },
  datePublished: article.created_at,
  dateModified: article.updated_at,
  image: article.image_url || article.banner_url,
  publisher: {
    "@type": "Organization",
    name: "Best MBA Coaching",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/article/${article.slug}` },
  keywords: (article.keywords || []).join(", "),
});

export const generateCollegeSchema = (college: any) => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: college.name,
  description: college.meta_description || college.description || `${college.name} is a premier MBA college in ${college.city}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: college.city,
    addressRegion: college.state,
    addressCountry: "IN",
  },
  url: college.website || `${SITE_URL}/college/${college.slug}`,
  foundingDate: college.established ? String(college.established) : undefined,
  aggregateRating: college.ranking
    ? {
        "@type": "AggregateRating",
        ratingValue: "4.5",
        bestRating: "5",
        ratingCount: college.total_students || 100,
      }
    : undefined,
});

export const generateInstituteSchema = (institute: any) => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: institute.name,
  description: institute.meta_description || institute.description || `${institute.name} - MBA coaching in ${institute.city}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: institute.city,
    addressRegion: institute.state,
    addressCountry: "IN",
  },
  url: institute.website || `${SITE_URL}/institute/${institute.slug}`,
  telephone: institute.phone,
  aggregateRating: institute.rating
    ? {
        "@type": "AggregateRating",
        ratingValue: String(institute.rating),
        bestRating: "5",
        ratingCount: String(institute.total_reviews || 10),
      }
    : undefined,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Courses",
    itemListElement: (institute.courses || []).map((c: any) => ({
      "@type": "Course",
      name: c.name,
      description: c.description,
      provider: { "@type": "Organization", name: institute.name },
      offers: c.fees ? { "@type": "Offer", price: String(c.fees), priceCurrency: "INR" } : undefined,
    })),
  },
});

export const generateExamSchema = (exam: any) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  name: exam.full_name || exam.name,
  description: exam.meta_description || exam.description,
  organizer: { "@type": "Organization", name: exam.conducting_body || "Unknown" },
  startDate: exam.exam_date,
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: { "@type": "Place", name: "India", address: { "@type": "PostalAddress", addressCountry: "IN" } },
});

export const generateListingSchema = (title: string, items: any[], type = "college") => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: title,
  numberOfItems: items.length,
  itemListElement: items.slice(0, 20).map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "EducationalOrganization",
      name: item.name,
      url: `${SITE_URL}/${type}/${item.slug}`,
      address: item.city ? { "@type": "PostalAddress", addressLocality: item.city } : undefined,
    },
  })),
});

export const generateComparisonSchema = (courses: any[]) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Compare MBA Coaching Courses — Side by Side Comparison",
  description: "Compare top MBA coaching courses by fees, curriculum, success rates, faculty, and student reviews.",
  url: `${SITE_URL}/compare`,
  mainEntity: {
    "@type": "ItemList",
    name: "MBA Coaching Courses Comparison",
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.name,
        provider: { "@type": "Organization", name: c.institutes?.name || "" },
        offers: c.fees ? { "@type": "Offer", price: String(c.fees), priceCurrency: "INR" } : undefined,
      },
    })),
  },
});

export const generateFAQSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `${SITE_URL}${item.url}`,
  })),
});
