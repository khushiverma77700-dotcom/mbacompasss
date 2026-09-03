import { useEffect, useState } from "react";
import { useParams, Navigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";

/**
 * Legacy indexed URLs like `/asm-ibmr-pune` or `/pumba-pune-mba-admission`
 * (no `/college/` prefix, sometimes with an `-admission` / `-mba-admission`
 * suffix) were flagged as Soft 404 in Google Search Console. Try to resolve
 * the slug against the `colleges` table and 301-equivalent redirect to the
 * canonical `/college/:slug`. If no match, render real NotFound.
 */
const LegacyCollegeSlugRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const [target, setTarget] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return setTarget(null);
    const candidates = Array.from(
      new Set([
        slug,
        slug.replace(/-mba-admission$/, ""),
        slug.replace(/-admission$/, ""),
        slug.replace(/-mba$/, ""),
      ]),
    );
    (async () => {
      const { data } = await supabase
        .from("colleges")
        .select("slug")
        .in("slug", candidates)
        .limit(1)
        .maybeSingle();
      setTarget(data?.slug ?? null);
    })();
  }, [slug]);

  if (target === undefined) return <div className="min-h-[40vh]" />;
  if (!target) return <NotFound />;
  return <Navigate to={`/college/${target}`} replace />;
};

export default LegacyCollegeSlugRedirect;
