import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * SEO landing shells for coaching category hubs.
 *   /coaching/exam/:slug  → /coaching?exam=SLUG
 *   /coaching/mode/:slug  → /coaching?mode=Slug
 * Registered in sitemap.xml so crawlers pick them up; the redirect
 * lands them on the filtered coaching listing.
 */
export default function CoachingCategoryRedirect({ kind }: { kind: "exam" | "mode" }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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
      const mode = modeMap[slug.toLowerCase()] || "all";
      navigate(`/coaching?mode=${encodeURIComponent(mode)}`, { replace: true });
    } else {
      navigate(`/coaching?exam=${encodeURIComponent(slug.toLowerCase())}`, { replace: true });
    }
  }, [slug, kind, navigate]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-slate-500">
      Loading coaching institutes…
    </div>
  );
}
