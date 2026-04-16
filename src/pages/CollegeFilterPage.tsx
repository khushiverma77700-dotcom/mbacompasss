import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCityPageBySlug } from "@/hooks/useCityPages";

/**
 * Legacy /colleges/:region route — redirects to canonical /colleges?city=... or ?state=...
 * Filters auto-apply on landing via the shared CollegesPage component.
 */
const CollegeFilterPage = () => {
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
    navigate(`/colleges?${params.toString()}`, { replace: true });
  }, [cityPage, isLoading, region, navigate]);

  return <div className="min-h-[40vh]" />;
};

export default CollegeFilterPage;
