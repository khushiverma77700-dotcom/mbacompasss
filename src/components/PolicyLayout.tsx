import { ReactNode } from "react";
import SEOHead from "@/components/SEOHead";

interface PolicyLayoutProps {
  title: string;
  description: string;
  canonical: string;
  lastUpdated?: string;
  children: ReactNode;
}

const PolicyLayout = ({ title, description, canonical, lastUpdated = "June 22, 2026", children }: PolicyLayoutProps) => {
  return (
    <>
      <SEOHead
        title={`${title} | MBA Compass`}
        description={description}
        canonical={canonical}
      />
      <main className="bg-white">
        <header className="bg-gradient-to-b from-sky-50 to-white border-b border-sky-100">
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
            <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase mb-3">MBA Compass</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-3">{title}</h1>
            <p className="text-slate-600 text-base md:text-lg">{description}</p>
            <p className="text-xs text-slate-500 mt-4">Last updated: {lastUpdated}</p>
          </div>
        </header>
        <article className="max-w-3xl mx-auto px-4 py-10 md:py-14 prose prose-slate prose-headings:font-heading prose-headings:text-slate-900 prose-a:text-sky-700 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700 max-w-none">
          {children}
        </article>
      </main>
    </>
  );
};

export default PolicyLayout;
