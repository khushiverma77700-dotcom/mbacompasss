import { useEffect, useState } from "react";
import { ArrowRight, X, Sparkles } from "lucide-react";

/**
 * Google Preferred Source CTA — premium pill that deep-links to Google's
 * "Preferred Sources" page so signed-in Google users can pin BSchoolBuzz
 * in Top Stories / Discover.
 *
 * Variants:
 *  - "inline": rendered inside content (article/blog) — not dismissible.
 *  - "banner": dismissible site-wide strip (mounted once in PublicLayout).
 */

const PREFERRED_URL =
  "https://www.google.com/preferences/source?hl=en&source=bschoolbuzz.com";
const DISMISS_KEY = "gps_banner_dismissed_v1";

interface Props {
  variant?: "inline" | "banner";
  className?: string;
}

const GoogleG = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 34.6 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.5C41.2 36.5 44 30.8 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const PremiumPill = ({ compact = false }: { compact?: boolean }) => (
  <a
    href={PREFERRED_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`group relative inline-flex items-center gap-3 rounded-full overflow-hidden
      bg-gradient-to-r from-card via-card to-card
      hover:from-primary/5 hover:via-card hover:to-primary/5
      shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.18)]
      transition-all duration-300
      ${compact ? "pl-2 pr-3 py-1.5" : "pl-2.5 pr-4 py-2"}
      border border-primary/15 hover:border-primary/40`}
    style={{
      backgroundImage:
        "linear-gradient(white, white), linear-gradient(90deg, hsl(207 90% 54%), hsl(207 90% 70%), hsl(207 90% 54%))",
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
    }}
  >
    <span
      className={`flex items-center justify-center rounded-full bg-background ring-1 ring-border/60 shrink-0 ${
        compact ? "w-7 h-7" : "w-8 h-8"
      }`}
    >
      <GoogleG className={compact ? "w-4 h-4" : "w-[18px] h-[18px]"} />
    </span>
    <span className="flex flex-col leading-tight min-w-0">
      <span
        className={`font-bold text-foreground tracking-tight whitespace-nowrap ${
          compact ? "text-[12.5px]" : "text-sm"
        }`}
      >
        Add BSchoolBuzz on Google
      </span>
      {!compact && (
        <span className="text-[10.5px] text-muted-foreground font-medium tracking-wide flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
          Set as preferred source · Top Stories
        </span>
      )}
    </span>
    <span
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 group-hover:translate-x-0.5 transition-transform ${
        compact ? "w-5 h-5" : "w-6 h-6"
      }`}
    >
      <ArrowRight className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
    </span>
  </a>
);

const GooglePreferredSourceCTA = ({ variant = "inline", className = "" }: Props) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (variant === "banner") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } else {
      setDismissed(false);
    }
  }, [variant]);

  if (variant === "banner") {
    if (dismissed) return null;
    return (
      <div
        className={`w-full border-b border-primary/10 ${className}`}
        style={{
          background:
            "linear-gradient(90deg, hsl(207 90% 97%) 0%, hsl(0 0% 100%) 50%, hsl(207 90% 97%) 100%)",
        }}
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 relative">
          <PremiumPill compact />
          <button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-background transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <PremiumPill />
    </div>
  );
};

export default GooglePreferredSourceCTA;
