import { ReactNode, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnrolledBundleFeatures } from "@/hooks/useEnrolledBundleFeatures";
import { FeatureKey, FEATURE_DEFINITIONS } from "@/lib/courseFeatures";
import UpgradeDialog from "@/components/student/UpgradeDialog";

interface Props {
  feature: FeatureKey;
  children: ReactNode;
  /** When true, renders nothing instead of the locked card (use for sidebar items if you prefer). */
  hideWhenLocked?: boolean;
  className?: string;
}

/**
 * Wraps a feature card. If the user's enrolled bundle includes the feature,
 * children render normally. Otherwise children render blurred, with a lock
 * overlay and an Upgrade CTA.
 */
export default function FeatureGate({ feature, children, hideWhenLocked, className }: Props) {
  const { isEnabled, loading } = useEnrolledBundleFeatures();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const def = FEATURE_DEFINITIONS.find((f) => f.key === feature);

  if (loading) return <>{children}</>;
  if (isEnabled(feature)) return <>{children}</>;
  if (hideWhenLocked) return null;

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/70 backdrop-blur-sm border border-sky-100 p-4 text-center">
        <div className="h-10 w-10 rounded-full bg-sky-100 grid place-items-center">
          <Lock className="h-5 w-5 text-sky-600" />
        </div>
        <div className="text-sm font-semibold text-foreground">
          {def?.label ?? "Premium feature"}
        </div>
        <div className="text-xs text-muted-foreground max-w-xs">
          Not included in your current course. Upgrade to unlock {def?.label ?? "this feature"}.
        </div>
        <Button size="sm" onClick={() => setUpgradeOpen(true)} className="mt-1">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade to access
        </Button>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureLabel={def?.label} />
    </div>
  );
}

/** Lightweight inline lock icon for sidebar/nav items. */
export function FeatureLockBadge({ feature }: { feature: FeatureKey }) {
  const { isEnabled, loading } = useEnrolledBundleFeatures();
  if (loading || isEnabled(feature)) return null;
  return <Lock className="h-3 w-3 text-muted-foreground ml-auto" aria-label="Locked" />;
}
