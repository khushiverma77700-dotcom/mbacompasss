import { useEffect } from "react";
import { normalizeReviewSchemas } from "@/lib/normalizeReviewSchema";

// The ONLY canonical host for this site. All canonical / og:url / JSON-LD
// URLs we emit always point at this host, regardless of which alias is
// currently serving the page (www, dashboard subdomain, lovable preview,
// etc). This prevents Google from indexing duplicate copies on the
// preview / staging hosts.
const CANONICAL_ORIGIN = "https://mbacompass.in";
const SITE_URL = CANONICAL_ORIGIN;

// Hosts that should NEVER be indexed by search engines. The SPA shell
// is reachable on multiple aliases; we add a runtime noindex on any host
// other than the canonical apex (and its www alias which redirects).
const INDEXABLE_HOSTS = new Set(["mbacompass.in", "www.mbacompass.in"]);

// Rewrite ANY absolute URL to use the canonical apex host. Accepts a
// full URL or path; returns a fully-qualified canonical URL.
const toCanonicalHost = (url?: string) => {
  if (!url) return url;
  try {
    // If it's already a full URL, swap the origin to the canonical apex.
    const u = new URL(url, CANONICAL_ORIGIN);
    return `${CANONICAL_ORIGIN}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
};


interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
}

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const SEOHead = ({
  title,
  description,
  keywords,
  canonical,
  jsonLd,
  ogImage,
  ogTitle,
  ogDescription,
  ogType = "website",
  twitterTitle,
  twitterDescription,
  twitterCard = "summary_large_image",
  noIndex,
}: SEOHeadProps) => {
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;
  useEffect(() => {
    if (title) document.title = title;

    const syncMeta = (name: string, content?: string, attr = "name") => {
      const selector = `meta[${attr}="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;

      if (!content) {
        el?.remove();
        return;
      }

      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }

      el.setAttribute("content", content);
    };

    syncMeta("description", description);
    // M5: keywords meta — cap at 10 terms; drop if empty. Google itself ignores
    // this tag, but bloated values look low-quality to other crawlers.
    const cappedKeywords = (keywords || [])
      .map((k) => (k || "").trim())
      .filter(Boolean)
      .slice(0, 10);
    syncMeta("keywords", cappedKeywords.length ? cappedKeywords.join(", ") : undefined);

    // Always force the non-www apex on canonical / og:url, regardless of
    // whether the page is currently being viewed on www.mbacompass.in.
    const canonicalHref = toCanonicalHost(canonical);

    // Open Graph
    syncMeta("og:title", ogTitle || title, "property");
    syncMeta("og:description", ogDescription || description, "property");
    syncMeta("og:image", resolvedOgImage, "property");
    syncMeta("og:site_name", "MBA Compass", "property");
    syncMeta("og:type", ogType, "property");
    syncMeta("og:url", canonicalHref, "property");

    // Twitter Card
    syncMeta("twitter:card", twitterCard);
    syncMeta("twitter:title", twitterTitle || ogTitle || title);
    syncMeta("twitter:description", twitterDescription || ogDescription || description);
    syncMeta("twitter:image", resolvedOgImage);

    // Robots — force noindex when:
    //   1. The caller explicitly asks (noIndex prop), OR
    //   2. The page is served from a non-canonical host (preview / staging /
    //      dashboard subdomain) — prevents Google indexing duplicate copies
    //      on the lovable.app preview domain.
    //   3. M6: The URL has any query-string filter params other than `page`
    //      (?city=, ?sort=, ?q= etc) — these create infinite parameterized
    //      duplicates of every listing page. We emit `noindex, follow` so
    //      crawlers still walk the links but don't index the filtered URL.
    const currentHost =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    const hostIsNonIndexable = currentHost !== "" && !INDEXABLE_HOSTS.has(currentHost);
    let hasFilterParams = false;
    if (typeof window !== "undefined" && window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      for (const key of sp.keys()) {
        if (key !== "page") { hasFilterParams = true; break; }
      }
    }
    const shouldNoIndex = noIndex || hostIsNonIndexable || hasFilterParams;
    syncMeta(
      "robots",
      shouldNoIndex
        ? "noindex, follow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );


    // Canonical — always non-www
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalHref) {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalHref);
    } else {
      link?.remove();
    }

    // L1: hreflang — India-focused site. Emit en-IN + x-default both
    // pointing to the same canonical URL so Google treats India as the
    // primary region and serves it to other English locales by default.
    document.querySelectorAll('link[rel="alternate"][data-seo-hreflang]').forEach(n => n.remove());
    if (canonicalHref && !shouldNoIndex) {
      (["en-IN", "x-default"] as const).forEach((hl) => {
        const a = document.createElement("link");
        a.setAttribute("rel", "alternate");
        a.setAttribute("hreflang", hl);
        a.setAttribute("href", canonicalHref);
        a.setAttribute("data-seo-hreflang", "1");
        document.head.appendChild(a);
      });
    }

    // L7: RSS feed auto-discovery for /articles
    if (!document.querySelector('link[rel="alternate"][type="application/rss+xml"]')) {
      const rss = document.createElement("link");
      rss.setAttribute("rel", "alternate");
      rss.setAttribute("type", "application/rss+xml");
      rss.setAttribute("title", "MBA Compass — Articles");
      rss.setAttribute("href", `${CANONICAL_ORIGIN}/feed.xml`);
      document.head.appendChild(rss);
    }

    // JSON-LD — support single or array of schemas
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld]');
    existingScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const rawSchemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      // Route every Review/AggregateRating block through the central normalizer
      // so we never ship a top-level rating without `itemReviewed` (Google
      // Rich Results error "Missing field itemReviewed"). The normalizer also
      // strips itemReviewed from correctly-nested ratings, folds standalone
      // ratings into sibling reviewable parents, and drops invalid blocks.
      const pageName = (ogTitle || title || document.title || "").trim();
      const pageUrl = toCanonicalHost(canonical) || (typeof window !== "undefined" ? window.location.href : "");
      const contentType =
        ogType === "article" ? "article" :
        pageUrl.includes("/college/") ? "college" :
        pageUrl.includes("/institute/") ? "institute" :
        pageUrl.includes("/exam/") ? "exam" :
        "webpage";
      const normalized = normalizeReviewSchemas(rawSchemas, {
        contentType,
        name: pageName,
        url: pageUrl,
        image: ogImage,
      });
      // M2: WebSite + Organization ship sitewide in index.html — never re-emit
      // them per-route (Google flags duplicates). Other singleton types must
      // also appear only once per page.
      const singletonTypes = new Set([
        "FAQPage", "BreadcrumbList", "WebPage", "Organization", "WebSite",
      ]);
      const skipAlways = new Set(["Organization", "WebSite"]);
      const seen = new Set<string>();
      const schemas = normalized.filter((s) => {
        if (!s) return false;
        const t = (s as any)["@type"];
        const key = Array.isArray(t) ? t.join("|") : String(t || "");
        if (skipAlways.has(key)) return false;
        if (key && singletonTypes.has(key)) {
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      });
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
  }, [title, description, keywords, canonical, jsonLd, ogImage, ogTitle, ogDescription, ogType, twitterTitle, twitterDescription, twitterCard, noIndex]);

  return null;
};

export default SEOHead;

// ==========================================
// JSON-LD Schema Generators
// ==========================================

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MBA Compass",
  url: SITE_URL,
});

export const generateOrganizationSchema = () => ({
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

export const generateArticleSchema = (article: any) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: (article.meta_title || article.title || "").slice(0, 110),
  description: article.meta_description || article.excerpt || "",
  author: {
    "@type": "Person",
    name: article.author || "MBA Compass Editorial",
  },
  datePublished: article.created_at,
  dateModified: article.updated_at || article.created_at,
  // Google requires a valid image URL for Article rich results — fall back to the
  // sitewide OG image when the article has no banner/thumbnail of its own.
  image: article.image_url || article.banner_url || `${SITE_URL}/og-image.png`,
  publisher: {
    "@type": "Organization",
    name: "MBA Compass",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/article/${article.slug}` },
  keywords: (article.keywords || []).join(", "),
});


export const generateCollegeSchema = (college: any) => {
  // C3: Only emit aggregateRating when a REAL rating + review count exist.
  // Previously this hardcoded ratingValue: "4.5" with total_students as the count,
  // which Google treats as structured-data spam.
  const hasRealRating =
    typeof college.avg_rating === "number" &&
    typeof college.review_count === "number" &&
    college.review_count > 0;

  return {
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
    aggregateRating: hasRealRating
      ? {
          "@type": "AggregateRating",
          ratingValue: String(college.avg_rating),
          bestRating: "5",
          ratingCount: String(college.review_count),
        }
      : undefined,
  };
};

export const generateInstituteSchema = (institute: any) => {
  const courses = Array.isArray(institute.courses) ? institute.courses.filter(Boolean) : [];
  return {
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
    // C3: Only emit aggregateRating with a REAL rating AND a real review count.
    aggregateRating:
      typeof institute.rating === "number" &&
      typeof institute.total_reviews === "number" &&
      institute.total_reviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: String(institute.rating),
            bestRating: "5",
            ratingCount: String(institute.total_reviews),
          }
        : undefined,
    // Omit hasOfferCatalog entirely when there are no courses — Google flags
    // an OfferCatalog with an empty itemListElement as an invalid item.
    hasOfferCatalog: courses.length
      ? {
          "@type": "OfferCatalog",
          name: "Courses",
          itemListElement: courses.map((c: any) => ({
            "@type": "Course",
            name: c.name,
            description: c.description,
            provider: { "@type": "Organization", name: institute.name },
            offers: c.fees ? { "@type": "Offer", price: String(c.fees), priceCurrency: "INR" } : undefined,
          })),
        }
      : undefined,
  };
};

export const generateExamSchema = (exam: any) => {
  // Event requires a valid startDate per schema.org/Google. When the exam
  // has no scheduled date, downgrade to a WebPage describing the exam so
  // the Rich Results test doesn't fail validation.
  if (!exam?.exam_date) {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: exam?.full_name || exam?.name,
      description: exam?.meta_description || exam?.description,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: exam.full_name || exam.name,
    description: exam.meta_description || exam.description,
    organizer: { "@type": "Organization", name: exam.conducting_body || "MBA Compass" },
    startDate: exam.exam_date,
    endDate: exam.exam_end_date || exam.exam_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: "India", address: { "@type": "PostalAddress", addressCountry: "IN" } },
  };
};

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
