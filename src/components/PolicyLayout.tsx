import { ReactNode } from "react";
import { Link } from "react-router-dom";
import SEOHead, { generateBreadcrumbSchema, generateFAQSchema } from "@/components/SEOHead";
import { ChevronRight } from "lucide-react";

interface FAQ { q: string; a: string }

interface PolicyLayoutProps {
  title: string;
  description: string;
  canonical: string;
  lastUpdated?: string;
  faqs?: FAQ[];
  children: ReactNode;
}

const PolicyLayout = ({
  title,
  description,
  canonical,
  lastUpdated = "June 22, 2026",
  faqs,
  children,
}: PolicyLayoutProps) => {
  // WebPage + Breadcrumb + optional FAQPage — stacked into a single @graph for AI Search & Google.
  const graph: any[] = [
    {
      "@type": "WebPage",
      "@id": canonical,
      name: title,
      description,
      url: canonical,
      inLanguage: "en-IN",
      isPartOf: { "@id": "https://mbacompass.in/#website" },
      datePublished: "2026-01-01",
      dateModified: new Date().toISOString().slice(0, 10),
      publisher: { "@type": "Organization", name: "MBA Compass", url: "https://mbacompass.in" },
    },
    generateBreadcrumbSchema([
      { name: "Home", url: "https://mbacompass.in" },
      { name: title, url: canonical },
    ]),
  ];
  if (faqs && faqs.length > 0) {
    graph.push(generateFAQSchema(faqs));
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <>
      <SEOHead
        title={`${title} | MBA Compass`}
        description={description}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <main className="bg-white">
        <header className="bg-gradient-to-b from-sky-50 to-white border-b border-sky-100">
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 mb-4">
              <Link to="/" className="hover:text-sky-700">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-700 font-medium">{title}</span>
            </nav>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-3">{title}</h1>
            <p className="text-slate-600 text-base md:text-lg">{description}</p>
            <p className="text-xs text-slate-500 mt-4">Last updated: {lastUpdated}</p>
          </div>
        </header>
        <article className="max-w-3xl mx-auto px-4 py-10 md:py-14 prose prose-slate prose-headings:font-heading prose-headings:text-slate-900 prose-a:text-sky-700 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700 max-w-none">
          {children}

          {faqs && faqs.length > 0 && (
            <section className="not-prose mt-14 pt-10 border-t border-slate-200">
              <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">Frequently asked questions</h2>
              <p className="text-sm text-slate-600 mb-6">Direct answers about this policy.</p>
              <dl className="space-y-5">
                {faqs.map((f, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
                    <dt className="font-heading font-semibold text-slate-900 text-base mb-2">{f.q}</dt>
                    <dd className="text-sm text-slate-700 leading-relaxed">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>
      </main>
    </>
  );
};

export default PolicyLayout;
