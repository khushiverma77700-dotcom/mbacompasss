import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

/**
 * Google Preferred Source CTA
 * Deep-links to Google's "Preferred Sources" preference page so signed-in
 * Google users can pin BSchoolBuzz in Top Stories / Discover.
 *
 * Variants:
 *  - "inline": rendered inside content (article pages, blog hero) — not dismissible.
 *  - "banner": dismissible site-wide bar (homepage), persisted in localStorage.
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

const Pill = ({ className = "" }: { className?: string }) => (
  <a
    href={PREFERRED_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`group inline-flex items-center gap-2.5 bg-card hover:bg-card/95 text-foreground font-semibold pl-3 pr-4 py-2.5 rounded-full shadow-md hover:shadow-lg border-2 border-primary/40 hover:border-primary transition-all duration-200 ${className}`}
  >
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-background shrink-0">
      <GoogleG className="w-4.5 h-4.5" />
    </span>
    <span className="text-sm md:text-[0.95rem] tracking-tight">
      Add BSchoolBuzz as preferred source on Google
    </span>
    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
  </a>
);

const GooglePreferredSourceCTA = ({ variant = "inline", className = "" }: Props) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (variant === "banner") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, [variant]);

  if (variant === "banner") {
    if (dismissed) return null;
    return (
      <div className={`w-full bg-primary/10 border-b border-primary/20 ${className}`}>
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 relative">
          <Pill className="!shadow-sm" />
          <button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-background/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <Pill />
    </div>
  );
};

export default GooglePreferredSourceCTA;
