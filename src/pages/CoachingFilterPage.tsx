import { useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { useCityPageBySlug } from "@/hooks/useCityPages";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { canonicalUrl } from "@/lib/canonical";
import { getRegionHubSeo } from "@/lib/coachingSeoTemplates";

/**
 * Legacy /coaching/:region route — redirects to canonical /coaching?city=... or ?state=...
 * SEO metadata (title, description, H1, breadcrumbs, keywords) is sourced from
 * the shared `getRegionHubSeo` template so every city / state hub gets consistent
 * category-specific copy.
 */
const CoachingFilterPage = () => {
  const { region } = useParams<{ region: string }>();
  const navigate = useNavigate();
  const { data: cityPage, isLoading } = useCityPageBySlug(region);

  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams();
    if (cityPage?.type === "state") {
      params.set("state", cityPage.name);
    } else if (cityPage?.name) {
      params.set("city", cityPage.name);
      if (cityPage.state) params.set("state", cityPage.state);
    } else {
      const derived = (region || "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      if (derived) params.set("city", derived);
    }
    navigate(`/coaching?${params.toString()}`, { replace: true });
  }, [cityPage, isLoading, region, navigate]);

  const template = getRegionHubSeo(region || "", cityPage?.type === "state" ? "state" : "city");
  return (
    <>
      <SEOHead
        title={template.title}
        description={template.description}
        keywords={template.keywords}
        canonical={canonicalUrl(`/coaching/${(region || "").toLowerCase()}`)}
        jsonLd={[generateBreadcrumbSchema(template.breadcrumbs)]}
      />
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">
          {template.h1}
        </h1>
        <p className="text-slate-500 text-sm">Loading coaching institutes…</p>
      </div>
    </>
  );
};

export default CoachingFilterPage;
