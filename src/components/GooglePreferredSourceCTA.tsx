import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Google Preferred Source CTA — premium animated pill that deep-links to
 * Google's "Preferred Sources" page so signed-in Google users can pin
 * MBA Compass in Top Stories / Discover.
 *
 * Designed to live INSIDE the Navbar (desktop + mobile) — no separate banner row.
 */

// Google Preferred Sources — `q` pre-fills the search box with our domain
// so the user only needs to tap the result + "Save". No manual typing.
const PREFERRED_URL =
  "https://www.google.com/preferences/source?q=mbacompass.in&hl=en";

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
    <motion.a
      href={PREFERRED_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Add MBA Compass as preferred source on Google"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.2 
      }}
      whileHover={{ 
        y: -2, 
        boxShadow: "0 8px 30px -8px hsl(var(--primary) / 0.35)",
        transition: { duration: 0.25, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      className={`group relative inline-flex items-center gap-2 rounded-full overflow-hidden
        bg-card border border-primary/25 
        shadow-sm hover:border-primary/60
        transition-colors duration-300
        ${isFull ? "px-3 py-2 w-full justify-center" : "px-2.5 py-1.5"}
        ${className}`}
    >
      {/* Animated gradient background on hover */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 50%, hsl(var(--primary) / 0.08) 100%)"
        }}
      />

      {/* Animated shimmer sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-out
          bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />

      {/* Pulsing glow effect */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-0.5 rounded-full opacity-0 group-hover:opacity-100"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)"
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0, 0.6, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.span 
        className="relative flex items-center justify-center w-6 h-6 rounded-full bg-background ring-1 ring-border shrink-0"
        whileHover={{ scale: 1.15, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <GoogleG className="w-[14px] h-[14px]" />
      </motion.span>

      <span
        className={`relative font-semibold text-foreground tracking-tight whitespace-nowrap ${
          isFull ? "text-sm" : "text-[12.5px]"
        }`}
      >
        Add MBA Compass <span className="text-muted-foreground font-medium">as preferred source on</span>{" "}
        <span className="text-primary">Google</span>
      </span>

      <motion.div
        animate={{ 
          rotate: [0, 15, -15, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          ease: "easeInOut"
        }}
      >
        <Sparkles
          className="relative w-3 h-3 text-primary shrink-0"
          aria-hidden="true"
        />
      </motion.div>

      {/* Subtle border glow animation */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0)"
        }}
        animate={{
          boxShadow: [
            "inset 0 0 0 1px hsl(var(--primary) / 0)",
            "inset 0 0 0 1px hsl(var(--primary) / 0.3)",
            "inset 0 0 0 1px hsl(var(--primary) / 0)"
          ]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.a>
  );
};

export default GooglePreferredSourceCTA;
