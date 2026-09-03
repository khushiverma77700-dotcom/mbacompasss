import { useEffect } from "react";
import { Navigate, useParams } from "@/lib/router-compat";

/**
 * Legacy `/college/:slug/programme/:programmeSlug` URLs were indexed by Google
 * but never had a real route → SPA fell through to NotFound → flagged as
 * Soft 404 in Search Console. The programme content lives inside the parent
 * college page, so redirect to `/college/:slug` (with the programme slug as a
 * hash so any tab handler on the college page can auto-scroll/select it).
 */
const CollegeProgrammeRedirect = () => {
  const { slug, programmeSlug } = useParams<{ slug: string; programmeSlug: string }>();

  // Set a canonical hint before Navigate mounts, so if a crawler runs JS it
  // sees the canonical URL immediately.
  useEffect(() => {
    if (!slug) return;
    const canonical = `https://mbacompass.in/college/${slug}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
  }, [slug]);

  if (!slug) return <Navigate to="/colleges" replace />;
  const hash = programmeSlug ? `#programme-${programmeSlug}` : "";
  return <Navigate to={`/college/${slug}${hash}`} replace />;
};

export default CollegeProgrammeRedirect;
