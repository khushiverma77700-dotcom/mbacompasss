import { useParams, Link, Navigate } from "@/lib/router-compat";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { AUTHORS } from "./AuthorsPage";
import { Mail, Linkedin } from "lucide-react";

const AuthorDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const author = AUTHORS.find((a) => a.slug === slug);

  if (!author) {
    return <Navigate to="/authors" replace />;
  }

  const url = `https://mbacompass.in/authors/${author.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": url,
        url,
        name: author.name,
        description: author.short,
        mainEntity: {
          "@type": "Person",
          name: author.name,
          url,
          image: "https://mbacompass.in/og-image.png",
          jobTitle: author.role,
          description: author.short,
          knowsAbout: author.expertise,
          email: "suyash@bschoolbuzz.in",
          worksFor: {
            "@type": "Organization",
            name: "MBA Compass",
            url: "https://mbacompass.in",
          },
          sameAs: [
            "https://www.linkedin.com/company/mba-compass",
            "https://www.instagram.com/mbacompass.in",
            "https://twitter.com/mbacompass",
          ],
        },
      },
      generateBreadcrumbSchema([
        { name: "Home", url: "https://mbacompass.in" },
        { name: "Authors", url: "https://mbacompass.in/authors" },
        { name: author.name, url },
      ]),
    ],
  };

  return (
    <>
      <SEOHead
        title={`${author.name} — Author at MBA Compass`}
        description={author.short}
        canonical={url}
        jsonLd={jsonLd}
        ogType="profile"
      />
      <div className="bg-white">
        <header className="bg-gradient-to-b from-sky-50 to-white border-b border-sky-100">
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
            <Link to="/authors" className="text-xs font-semibold text-sky-700 uppercase tracking-wider hover:underline">
              ← All authors
            </Link>
            <div className="flex items-start gap-5 mt-5">
              <div className="w-20 h-20 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-heading font-bold text-2xl shrink-0">
                MC
              </div>
              <div className="flex-1">
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">
                  {author.name}
                </h1>
                <p className="text-sky-700 font-medium">{author.role}</p>
                <p className="text-slate-600 mt-2">{author.short}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-10">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-3">About</h2>
            <p className="text-slate-700 leading-relaxed">
              The MBA Compass Editorial Team is a group of full-time researchers and editors
              tracking the Indian MBA ecosystem — IIMs, top-tier private B-schools, exam conducting
              bodies, coaching institutes, and placement outcomes. We publish under a collective
              byline because most of our work — cut-off lists, fee comparisons, ranking
              breakdowns — is produced collaboratively. Individual contributors are credited on
              long-form features and original interviews.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-3">Areas of expertise</h2>
            <div className="flex flex-wrap gap-2">
              {author.expertise.map((e) => (
                <span
                  key={e}
                  className="text-xs px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-100"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-3">Editorial standards</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Every piece this team publishes follows our{" "}
              <Link to="/editorial-policy" className="text-sky-700 hover:underline">
                Editorial Policy
              </Link>{" "}
              and{" "}
              <Link to="/fact-check-policy" className="text-sky-700 hover:underline">
                Fact-Check &amp; Corrections Policy
              </Link>
              . Numerical claims are sourced from official institute communication, NIRF reports,
              placement reports, or government bodies, and pages are refreshed every admission
              cycle.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-3">Contact</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:suyash@bschoolbuzz.in"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
              >
                <Mail className="w-4 h-4" /> suyash@bschoolbuzz.in
              </a>
              <a
                href="https://www.linkedin.com/company/mba-compass"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
              >
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AuthorDetailPage;
