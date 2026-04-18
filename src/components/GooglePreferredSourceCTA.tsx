import { Sparkles } from "lucide-react";

/**
 * Google Preferred Source CTA — premium animated pill that deep-links to
 * Google's "Preferred Sources" page so signed-in Google users can pin
 * BSchoolBuzz in Top Stories / Discover.
 *
 * Designed to live INSIDE the Navbar (desktop + mobile) — no separate banner row.
 */

const PREFERRED_URL =
  "https://www.google.com/preferences/source?hl=en&source=bschoolbuzz.com";

interface Props {
  className?: string;
  /** "compact" for desktop nav, "full" for mobile menu */
  size?: "compact" | "full";
}

const GoogleG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 34.6 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.5C41.2 36.5 44 30.8 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const GooglePreferredSourceCTA = ({ className = "", size = "compact" }: Props) => {
  const isFull = size === "full";

  return (
    <a
      href={PREFERRED_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Add B School Buzz as preferred source on Google"
      className={`group relative inline-flex items-center gap-2 rounded-full overflow-hidden
        bg-card border border-primary/25 hover:border-primary/60
        shadow-sm hover:shadow-[0_6px_20px_hsl(var(--primary)/0.25)]
        transition-all duration-300 hover:-translate-y-0.5
        ${isFull ? "px-3 py-2 w-full justify-center" : "px-2.5 py-1.5"}
        ${className}`}
    >
      {/* Animated shimmer sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out
          bg-gradient-to-r from-transparent via-primary/15 to-transparent"
      />

      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-background ring-1 ring-border shrink-0 group-hover:scale-110 transition-transform">
        <GoogleG className="w-[14px] h-[14px]" />
      </span>

      <span
        className={`relative font-semibold text-foreground tracking-tight whitespace-nowrap ${
          isFull ? "text-sm" : "text-[12.5px]"
        }`}
      >
        Add B School Buzz <span className="text-muted-foreground font-medium">as preferred source on</span>{" "}
        <span className="text-primary">Google</span>
      </span>

      <Sparkles
        className="relative w-3 h-3 text-primary shrink-0 animate-pulse"
        aria-hidden="true"
      />
    </a>
  );
};

export default GooglePreferredSourceCTA;
