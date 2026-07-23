import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { canonicalUrl } from "@/lib/canonical";

/**
 * SEO landing shells for coaching category hubs.
 *   /coaching/exam/:slug  → /coaching?exam=SLUG
 *   /coaching/mode/:slug  → /coaching?mode=Slug
 *
 * These hub URLs are the canonical, indexable versions. The equivalent
 * filtered `/coaching?exam=...` / `?mode=...` variants already self-canonicalize
 * back to `/coaching`, so the hub URL here owns the topic and prevents duplicate
 * indexation from query-string filter variants.
 */
export default function CoachingCategoryRedirect({ kind }: { kind: "exam" | "mode" }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const normalizedSlug = (slug || "").toLowerCase();
  const canonical = useMemo(
    () => canonicalUrl(`/coaching/${kind}/${normalizedSlug}`),
    [kind, normalizedSlug],
  );

  const pretty = normalizedSlug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const title =
    kind === "exam"
      ? `${pretty.toUpperCase()} Coaching Institutes in India — Fees, Reviews & Batches`
      : `${pretty} Mode MBA Coaching — Best ${pretty} CAT/MBA Coaching Institutes`;

  const description =
    kind === "exam"
      ? `Compare the best ${pretty.toUpperCase()} coaching institutes in India. See fees, batch schedules, faculty, student reviews and enrol in the top ${pretty.toUpperCase()} preparation programs.`
      : `Explore the best ${pretty.toLowerCase()} MBA coaching institutes in India. Compare fees, faculty, schedules and reviews for ${pretty.toLowerCase()} CAT, XAT, GMAT and MBA entrance coaching.`;

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
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={[
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Coaching", url: "/coaching" },
            { name: kind === "exam" ? "By Exam" : "By Mode", url: `/coaching/${kind}/${normalizedSlug}` },
            { name: pretty, url: `/coaching/${kind}/${normalizedSlug}` },
          ]),
        ]}
      />
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">
        Loading coaching institutes…
      </div>
    </>
  );
}
