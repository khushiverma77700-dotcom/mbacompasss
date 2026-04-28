import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureKey, FeatureMap, allFeaturesOn } from "@/lib/courseFeatures";

/**
 * Returns the union of `features` JSONB across every active bundle the user is
 * enrolled in. If the user has NO bundle enrollment at all, we fall back to
 * "all on" to preserve legacy access (free trial / old buyers).
 */
export function useEnrolledBundleFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureMap>({});
  const [loading, setLoading] = useState(true);
  const [hasAnyBundle, setHasAnyBundle] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mock_bundle_enrollments")
        .select("bundle_id, expires_at, mock_bundles ( features )")
        .eq("user_id", user.id);
      const active = (data ?? []).filter((r: any) => !r.expires_at || new Date(r.expires_at) > new Date());
      const merged: FeatureMap = {};
      active.forEach((r: any) => {
        const f = (r.mock_bundles?.features ?? {}) as FeatureMap;
        Object.entries(f).forEach(([k, v]) => { if (v) merged[k as FeatureKey] = true; });
      });
      setHasAnyBundle(active.length > 0);
      setFeatures(active.length === 0 ? allFeaturesOn() : merged);
      setLoading(false);
    })();
  }, [user]);

  const isEnabled = (key: FeatureKey) => !!features[key];
  return { features, isEnabled, loading, hasAnyBundle };
}
