import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    // Fire a real HTTP 404 to the `not-found` edge function so that:
    //   - Server / edge logs record a genuine 404 for this URL.
    //   - Any crawler / monitoring tool that follows the beacon sees a real
    //     404 status instead of the SPA's default 200.
    //   - GSC URL inspection follow-up fetches can pick up the 404 signal.
    if (SUPABASE_URL) {
      const beacon = `${SUPABASE_URL}/functions/v1/not-found?path=${encodeURIComponent(
        location.pathname + location.search,
      )}`;
      // `keepalive` lets it complete even if the user navigates away.
      fetch(beacon, { method: "HEAD", keepalive: true, cache: "no-store" }).catch(
        () => {
          /* network errors here are non-fatal */
        },
      );
    }
  }, [location.pathname, location.search]);

  return (
    <>
      {/* CRITICAL: noindex tells Google this URL should NOT be indexed
          (prevents "Soft 404" verdicts in Google Search Console). */}
      <SEOHead
        title="404 — Page Not Found | MBA Compass"
        description="The page you are looking for does not exist."
        noIndex
      />
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center max-w-md px-4">
          <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
          <p className="mb-2 text-xl text-foreground">Page not found</p>
          <p className="mb-6 text-sm text-muted-foreground">
            The page <code className="bg-background px-1 rounded">{location.pathname}</code> doesn't exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/" className="text-primary underline hover:text-primary/90">Home</a>
            <a href="/colleges" className="text-primary underline hover:text-primary/90">Colleges</a>
            <a href="/blog" className="text-primary underline hover:text-primary/90">Articles</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
