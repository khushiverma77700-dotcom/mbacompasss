import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCityPageBySlug } from "@/hooks/useCityPages";

/**
 * Legacy /coaching/:region route — redirects to canonical /coaching?city=... or ?state=...
 * Ensures 100% UI/functional parity with the colleges module by reusing CoachingPage.
 * Filters auto-apply on landing; no manual city_pages row is required.
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
      // No admin row — derive city from slug
      const derived = (region || "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      if (derived) params.set("city", derived);
    }
    navigate(`/coaching?${params.toString()}`, { replace: true });
  }, [cityPage, isLoading, region, navigate]);

  return <div className="min-h-[40vh]" />;
};

export default CoachingFilterPage;
