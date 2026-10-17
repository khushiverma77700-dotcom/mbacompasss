import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  SubdomainGuard,
  StudentBackGuard,
  SettingsPrefetcher,
  DeferredToasters,
  DeferredGlobalLoginDialog,
  OnboardingGate,
  OAuthRedirectHandler,
} from "@/components/app-shell/AppShellEffects";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import NotFoundPage from "@/pages/NotFound";
import PublicLayoutShell from "@/components/layout/PublicLayoutShell";
import appCss from "../styles.css?url";

// ported from main.tsx
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

// ── Client boot side-effects ported from the pre-migration src/main.tsx ──
function runClientBoot() {
  if (typeof window === "undefined") return;

  // Warm the Supabase client chunk on auth-heavy entry routes so the first
  // auth call isn't gated behind a serial dynamic import.
  try {
    const host = window.location.hostname;
    const path = window.location.pathname;
    if (
      host === "dashboard.mbacompass.in" ||
      path.startsWith("/student") ||
      path === "/demo" ||
      path.startsWith("/demo/") ||
      path.startsWith("/admin") ||
      path.startsWith("/mocks") ||
      path.startsWith("/auth")
    ) {
      void import("@/integrations/supabase/client");
    }
  } catch {
    /* noop */
  }

  // Clear the stale-chunk reload guard once the new build has loaded.
  try {
    sessionStorage.removeItem("__chunk_reload_attempted__");
  } catch {
    /* noop */
  }

  // Catch chunk-load failures outside React rendering (lazy route imports
  // after a deploy) and force one hard reload to fetch fresh hashed assets.
  window.addEventListener("vite:preloadError", () => {
    const KEY = "__chunk_reload_attempted__";
    try {
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });

  // One-time legacy service-worker / caches cleanup — older published builds
  // registered a SW that can keep serving stale assets on mobile.
  const ONCE_KEY = "__sw_cleanup_done__";
  try {
    if (!localStorage.getItem(ONCE_KEY) && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          if (regs && regs.length > 0) {
            const clear = async () => {
              try {
                await Promise.all(regs.map((r) => r.unregister()));
              } catch {
                /* noop */
              }
              try {
                const keys = await caches?.keys?.();
                await Promise.all((keys || []).map((k) => caches.delete(k)));
              } catch {
                /* noop */
              }
            };
            void clear().finally(() => {
              try {
                localStorage.setItem(ONCE_KEY, "1");
              } catch {
                /* noop */
              }
            });
          } else {
            try {
              localStorage.setItem(ONCE_KEY, "1");
            } catch {
              /* noop */
            }
          }
        })
        .catch(() => {
          /* noop */
        });
    }
  } catch {
    /* noop */
  }
}

let bootRan = false;

const WEBSITE_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://mbacompass.in/#website",
  name: "MBA Compass",
  alternateName: ["MBACompass", "MBA Compass India"],
  url: "https://mbacompass.in",
  description:
    "India's trusted platform to find and compare the best MBA colleges and coaching institutes.",
  inLanguage: "en-IN",
  publisher: { "@id": "https://mbacompass.in/#organization" },
});

const ORG_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://mbacompass.in/#organization",
  name: "MBA Compass",
  legalName: "Akaniya Ventures Private Limited",
  alternateName: "MBA Compass by B School Buzz",
  url: "https://mbacompass.in",
  logo: {
    "@type": "ImageObject",
    url: "https://mbacompass.in/favicon.png",
  },
  image: "https://mbacompass.in/favicon.png",
  email: "suyash@bschoolbuzz.in",
  telephone: "+91-76681-29226",
  description:
    "MBA Compass helps Indian MBA aspirants find, compare and review the best MBA colleges and coaching institutes for CAT, GMAT, XAT, SNAP & GRE.",
  foundingDate: "2024",
  areaServed: { "@type": "Country", name: "India" },
  address: {
    "@type": "PostalAddress",
    addressRegion: "Uttar Pradesh",
    addressCountry: "IN",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-76681-29226",
      email: "suyash@bschoolbuzz.in",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  ],
  knowsAbout: [
    "CAT",
    "GMAT",
    "XAT",
    "SNAP",
    "NMAT",
    "CMAT",
    "IIFT",
    "MAT",
    "MBA Admissions",
    "B-School Rankings",
  ],
  publishingPrinciples: "https://mbacompass.in/editorial-policy",
  actionableFeedbackPolicy: "https://mbacompass.in/editorial-policy",
  correctionsPolicy: "https://mbacompass.in/fact-check-policy",
  ethicsPolicy: "https://mbacompass.in/editorial-policy",
  diversityPolicy: "https://mbacompass.in/editorial-policy",
  sameAs: [
    "https://www.linkedin.com/company/mba-compass",
    "https://www.instagram.com/mbacompass.in",
    "https://twitter.com/mbacompass",
  ],
});

// Canonical host enforcement: always serve the non-www apex.
const CANONICAL_HOST_SCRIPT = `(function(){try{var h=window.location.hostname;if(h==="www.mbacompass.in"){window.location.replace("https://mbacompass.in"+window.location.pathname+window.location.search+window.location.hash);}}catch(e){}})();`;

// Dashboard-subdomain path guard for the very first request.
const DASH_HOST_SCRIPT = `(function(){try{var h=window.location.hostname;if(h!=="dashboard.mbacompass.in")return;var p=window.location.pathname;var s=window.location.search||"";var hh=window.location.hash||"";if(p==="/"||p===""){window.location.replace("/student"+s+hh);return;}var allowed=["/student","/auth","/forgot-password","/reset-password","/formula","/formulas","/demo"];var ok=allowed.some(function(x){return p===x||p.indexOf(x+"/")===0;});if(!ok){window.location.replace("/student"+s+hh);}}catch(e){}})();`;

// Non-canonical host noindex (preview / dashboard / aliases).
const NOINDEX_SCRIPT = `(function(){try{var h=window.location.hostname;if(h==="mbacompass.in"||h==="www.mbacompass.in")return;var m=document.createElement("meta");m.setAttribute("name","robots");m.setAttribute("content","noindex, nofollow");document.head.appendChild(m);var g=document.createElement("meta");g.setAttribute("name","googlebot");g.setAttribute("content","noindex, nofollow");document.head.appendChild(g);}catch(e){}})();`;

// Font-loading race — add .fonts-loaded whichever finishes first.
const FONTS_LOADED_SCRIPT = `(function(){var done=false;function ready(){if(done)return;done=true;document.documentElement.classList.add('fonts-loaded');}if(document.fonts&&document.fonts.ready&&typeof document.fonts.ready.then==='function'){document.fonts.ready.then(ready).catch(ready);}setTimeout(ready,1500);})();`;

// Deferred GA4: injected on first interaction (or after 10s) so the
// third-party script never lands in the critical path.
const GA_DEFERRED_SCRIPT = `(function(){var loaded=false;function injectGA(){if(loaded)return;loaded=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-QV79FTE0XN';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','G-QV79FTE0XN',{transport_type:'beacon'});}function loadGA(){var idle=window.requestIdleCallback||function(cb){return setTimeout(cb,1);};idle(injectGA,{timeout:2000});}var events=['pointerdown','touchstart','keydown','scroll'];function once(){events.forEach(function(e){window.removeEventListener(e,once,{passive:true,capture:true});});loadGA();}events.forEach(function(e){window.addEventListener(e,once,{passive:true,capture:true});});setTimeout(loadGA,10000);})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5",
      },
      { name: "author", content: "MBA Compass" },
      { name: "theme-color", content: "#3b82f6", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0f172a", media: "(prefers-color-scheme: dark)" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "MBA Compass - CAT Prep" },
      { name: "application-name", content: "MBA Compass" },
      { name: "format-detection", content: "telephone=no" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      {
        httpEquiv: "Permissions-Policy",
        content: "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MBA Compass" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow" },
      {
        name: "google-site-verification",
        content: "r3SY9WIcZzdFg6MqQuaBq2OwA_YuTodCZfe0t5X4nrY",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://mttoiqruzzxooveooldo.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://mttoiqruzzxooveooldo.supabase.co" },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        fetchPriority: "high",
        href: "/fonts/dm-sans-400.woff2",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        fetchPriority: "low",
        href: "/fonts/plus-jakarta-sans-700.woff2",
      },
    ],
    scripts: [
      { children: CANONICAL_HOST_SCRIPT },
      { children: DASH_HOST_SCRIPT },
      { children: NOINDEX_SCRIPT },
      { children: FONTS_LOADED_SCRIPT },
      { children: GA_DEFERRED_SCRIPT },
      { type: "application/ld+json", children: WEBSITE_LD },
      { type: "application/ld+json", children: ORG_LD },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (bootRan) return;
    bootRan = true;
    runClientBoot();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DeferredToasters />
        <SettingsPrefetcher />
        <SubdomainGuard />
        <StudentBackGuard />
        <AuthProvider>
          <OAuthRedirectHandler />
          <OnboardingGate />
          <DeferredGlobalLoginDialog />
          <Outlet />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function RootNotFound() {
  return (
    <PublicLayoutShell>
      <NotFoundPage />
    </PublicLayoutShell>
  );
}

function RootErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  console.error(error);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="font-bold">This page didn't load</h1>
      <p className="text-muted-foreground">
        Something went wrong while loading this page. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-input bg-background px-4 py-2 font-medium hover:bg-accent"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
