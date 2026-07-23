import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { canonicalUrl } from "@/lib/canonical";
import { getExamHubSeo, getModeHubSeo } from "@/lib/coachingSeoTemplates";

/**
 * SEO landing shells for coaching category hubs.
 *   /coaching/exam/:slug  → /coaching?exam=SLUG
 *   /coaching/mode/:slug  → /coaching?mode=Slug
 *
 * Metadata (title, description, H1, breadcrumbs, keywords) is driven by the
 * central templates in `@/lib/coachingSeoTemplates` so every exam / mode hub
 * gets category-specific SEO copy from a single source of truth.
 */
export default function CoachingCategoryRedirect({ kind }: { kind: "exam" | "mode" }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const normalizedSlug = (slug || "").toLowerCase();
  const canonical = useMemo(
    () => canonicalUrl(`/coaching/${kind}/${normalizedSlug}`),
    [kind, normalizedSlug],
  );

  const template = useMemo(
    () => (kind === "exam" ? getExamHubSeo(normalizedSlug) : getModeHubSeo(normalizedSlug)),
    [kind, normalizedSlug],
  );

  useEffect(() => {
    if (!slug) {
      navigate("/coaching", { replace: true });
      return;
    }
    if (kind === "mode") {
      const modeMap: Record<string, string> = {
        online: "Online",
        offline: "Offline",
        classroom: "Offline",
        weekend: "Hybrid",
        "crash-course": "Hybrid",
        "self-paced": "Online",
      };
      const mode = modeMap[normalizedSlug] || "all";
      navigate(`/coaching?mode=${encodeURIComponent(mode)}`, { replace: true });
    } else {
      navigate(`/coaching?exam=${encodeURIComponent(normalizedSlug)}`, { replace: true });
    }
  }, [slug, kind, navigate, normalizedSlug]);

  return (
    <>
      <SEOHead
        title={template.title}
        description={template.description}
        keywords={template.keywords}
        canonical={canonical}
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
}
