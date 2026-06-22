import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  url: string; // absolute or path
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
  /** If true, the first "Home" crumb is prepended automatically. */
  withHome?: boolean;
}

const ABSOLUTE_ORIGIN = "https://mbacompass.in";

const toAbsolute = (u: string) =>
  u.startsWith("http") ? u : `${ABSOLUTE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;

/**
 * Renders a visible breadcrumb trail AND injects a BreadcrumbList JSON-LD
 * block so Google can show breadcrumb rich results for the page.
 */
const SiteBreadcrumbs = ({ items, className = "", withHome = true }: Props) => {
  const trail: BreadcrumbItem[] = withHome
    ? [{ name: "Home", url: "/" }, ...items]
    : items;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: toAbsolute(it.url),
    })),
  };

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center gap-1 text-xs sm:text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map((it, idx) => {
            const isLast = idx === trail.length - 1;
            return (
              <li key={`${it.url}-${idx}`} className="flex items-center gap-1">
                {idx === 0 && withHome ? (
                  <Link
                    to={it.url}
                    className="inline-flex items-center justify-center h-8 w-8 -m-1 rounded hover:text-primary hover:bg-muted/50"
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{it.name}</span>
                  </Link>
                ) : isLast ? (
                  <span aria-current="page" className="text-foreground font-medium line-clamp-1">
                    {it.name}
                  </span>
                ) : (
                  <Link to={it.url} className="hover:text-primary line-clamp-1">
                    {it.name}
                  </Link>
                )}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        // Escape closing-tag and JS-line-terminator sequences so a CMS-supplied
        // breadcrumb name can never break out of the inline JSON-LD block.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029"),
        }}
      />
    </>
  );
};

export default SiteBreadcrumbs;
