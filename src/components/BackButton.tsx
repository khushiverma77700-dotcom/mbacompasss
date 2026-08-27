import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Global back button shown on every public page except the homepage.
 * - Falls back to "/" when there is no in-app history (direct load / new tab).
 * - Large touch target (44px) so it works well on iOS and Android.
 */
const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/" || location.pathname === "") return null;

  const handleBack = () => {
    // window.history.state.idx > 0 means react-router has in-app history
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate("/", { replace: false });
    }
  };

  return (
    <div className="container mx-auto px-4 pt-3">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="group inline-flex items-center gap-2 min-h-[44px] rounded-full border border-border bg-card pl-2 pr-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-md active:scale-95"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back
      </button>
    </div>
  );
};

export default BackButton;
