import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Hint to crawlers via document title (in case Helmet hasn't applied yet)
    document.title = "404 — Page Not Found | MBA Compass";
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>404 — Page Not Found | MBA Compass</title>
        {/* CRITICAL: tell Google this URL should NOT be indexed (prevents Soft 404 in GSC) */}
        <meta name="robots" content="noindex, follow" />
        <meta name="googlebot" content="noindex, follow" />
        <meta name="prerender-status-code" content="404" />
      </Helmet>
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
