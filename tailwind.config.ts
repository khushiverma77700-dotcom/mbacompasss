import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Mobile-perf: include metric-matched fallback fonts (declared in
        // index.html critical CSS) so the system font renders at the same
        // dimensions as the web font — eliminates font-swap CLS.
        heading: ['Plus Jakarta Sans', 'Plus Jakarta Fallback', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'DM Sans Fallback', 'system-ui', 'sans-serif'],
        editorial: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },

      // ── UNIFIED TYPE SCALE ───────────────────────────────────────────────
      // The site previously used ~45 different font sizes, which looked
      // inconsistent. Every Tailwind size utility now resolves to one of
      // only FOUR real steps, so existing class names keep working while the
      // rendered typography stays uniform sitewide:
      //   detail  0.875rem  → text-xs / text-sm      (labels, meta, badges)
      //   body    1rem      → text-base / text-lg     (all reading text)
      //   subhead 1.375rem  → text-xl / text-2xl      (card + section titles)
      //   heading 2rem      → text-3xl and above      (page / hero titles)
      // Do NOT reintroduce arbitrary sizes such as text-[13px].
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.45" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.65" }],
        lg: ["1rem", { lineHeight: "1.65" }],
        xl: ["clamp(1.25rem, 1.6vw, 1.375rem)", { lineHeight: "1.35" }],
        "2xl": ["clamp(1.25rem, 1.6vw, 1.375rem)", { lineHeight: "1.3" }],
        "3xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.2" }],
        "5xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.15" }],
        "6xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.1" }],
        "7xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.1" }],
        "8xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.05" }],
        "9xl": ["clamp(1.75rem, 3.2vw, 2.25rem)", { lineHeight: "1.05" }],
      },


      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        cat: {
          mba: "hsl(var(--cat-mba))",
          medical: "hsl(var(--cat-medical))",
          engineering: "hsl(var(--cat-engineering))",
          government: "hsl(var(--cat-government))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "count-up": {
          from: { opacity: "0", transform: "scale(0.5)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
        "blob": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.1)" },
          "66%": { transform: "translate(-20px,20px) scale(0.95)" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "count-up": "count-up 0.6s ease-out forwards",
        marquee: "marquee 40s linear infinite",
        "marquee-reverse": "marquee-reverse 45s linear infinite",
        blob: "blob 14s ease-in-out infinite",
        "float-y": "float-y 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
