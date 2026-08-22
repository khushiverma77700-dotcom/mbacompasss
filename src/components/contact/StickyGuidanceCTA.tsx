import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/** Mobile/tablet sticky CTA. Hidden on desktop where in-section CTAs are visible. */
const StickyGuidanceCTA = ({ onClick, hidden }: { onClick: () => void; hidden?: boolean }) => (
  <div
    className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 transition-transform duration-200 ${
      hidden ? "translate-y-full" : "translate-y-0"
    }`}
    style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
  >
    <Button className="w-full min-h-12 text-base" onClick={onClick}>
      Get Free MBA Guidance <ArrowRight className="w-4 h-4 ml-1.5" />
    </Button>
  </div>
);

export default StickyGuidanceCTA;
