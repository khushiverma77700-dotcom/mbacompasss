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
  const [features, setFeatures] = useState<FeatureMap>(() => allFeaturesOn());
  const [loading, setLoading] = useState(false);
  const [hasAnyBundle, setHasAnyBundle] = useState(true);

  useEffect(() => {
    // Platform rule: every signed-in student gets all course features.
    setFeatures(user ? allFeaturesOn() : {});
    setHasAnyBundle(!!user);
    setLoading(false);
  }, [user]);

  const isEnabled = (key: FeatureKey) => !!features[key];
  return { features, isEnabled, loading, hasAnyBundle };
}
