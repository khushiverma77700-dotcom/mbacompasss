import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: Record<string, any>;
  ogImage?: string;
}

const SEOHead = ({ title, description, keywords, canonical, jsonLd, ogImage }: SEOHeadProps) => {
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
    if (title) {
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title);
    }
    if (description) {
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage);
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

    // JSON-LD
    if (jsonLd) {
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) existingScript.remove();
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.querySelector('script[data-seo-jsonld]');
      if (script) script.remove();
    };
  }, [title, description, keywords, canonical, jsonLd, ogImage]);

  return null;
};

export default SEOHead;

// JSON-LD generators
export const generateArticleSchema = (article: any) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.meta_title || article.title,
  description: article.meta_description || article.excerpt || "",
  author: { "@type": "Person", name: article.author || "MBAHub Team" },
  datePublished: article.created_at,
  dateModified: article.updated_at,
  image: article.image_url || article.banner_url,
  publisher: {
    "@type": "Organization",
    name: "MBAHub",
    logo: { "@type": "ImageObject", url: `${window.location.origin}/placeholder.svg` },
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": window.location.href },
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
  url: college.website,
  foundingDate: college.established ? String(college.established) : undefined,
  aggregateRating: college.ranking ? {
    "@type": "AggregateRating",
    ratingValue: "4.5",
    bestRating: "5",
    ratingCount: college.total_students || 100,
  } : undefined,
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
  url: institute.website,
  aggregateRating: institute.rating ? {
    "@type": "AggregateRating",
    ratingValue: String(institute.rating),
    bestRating: "5",
    ratingCount: String(institute.total_reviews || 10),
  } : undefined,
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
      url: `${window.location.origin}/${type}/${item.slug}`,
      address: item.city ? { "@type": "PostalAddress", addressLocality: item.city } : undefined,
    },
  })),
});
