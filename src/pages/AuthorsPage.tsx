import { Link } from "react-router-dom";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { Mail, BookOpen, Award } from "lucide-react";

export const AUTHORS = [
  {
    slug: "mba-compass-editorial-team",
    name: "MBA Compass Editorial Team",
    role: "Editorial Team",
    short:
      "Researches, reviews, and publishes content on MBA admissions, entrance exams, placements, rankings, and career opportunities.",
    expertise: ["CAT", "XAT", "NMAT", "SNAP", "GMAT", "MBA Admissions", "B-School Rankings", "Placements"],
  },
];

const AuthorsPage = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Authors at MBA Compass",
        url: "https://mbacompass.in/authors",
        description:
          "Meet the editorial team behind MBA Compass — researchers and editors covering Indian MBA admissions, exams, and placements.",
        hasPart: AUTHORS.map((a) => ({
          "@type": "Person",
          name: a.name,
          url: `https://mbacompass.in/authors/${a.slug}`,
          jobTitle: a.role,
          worksFor: { "@type": "Organization", name: "MBA Compass" },
          knowsAbout: a.expertise,
        })),
      },
      generateBreadcrumbSchema([
        { name: "Home", url: "https://mbacompass.in" },
        { name: "Authors", url: "https://mbacompass.in/authors" },
      ]),
    ],
  };

  return (
    <>
      <SEOHead
        title="Authors & Editorial Team | MBA Compass"
        description="Meet the editorial team behind MBA Compass — the people researching, writing, and reviewing content on MBA admissions, entrance exams, and B-school placements in India."
        canonical="https://mbacompass.in/authors"
        jsonLd={jsonLd}
      />
      <div className="bg-white">
        <header className="bg-gradient-to-b from-sky-50 to-white border-b border-sky-100">
          <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
            <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase mb-3">
              MBA Compass
            </p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Authors &amp; Editorial Team
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-2xl">
              Every article on MBA Compass is researched, written, or reviewed by someone listed
              here. We publish bylines and credentials so you always know who stands behind the
              content you read.
            </p>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <ul className="grid gap-5 md:grid-cols-1">
            {AUTHORS.map((a) => (
              <li
                key={a.slug}
                className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-sm transition-shadow"
              >
                <Link to={`/authors/${a.slug}`} className="block">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-heading font-bold text-lg shrink-0">
                      MC
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-heading font-bold text-lg text-slate-900">{a.name}</h2>
                      <p className="text-sm text-sky-700 font-medium">{a.role}</p>
                      <p className="text-sm text-slate-600 mt-2">{a.short}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {a.expertise.slice(0, 6).map((e) => (
                          <span
                            key={e}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-5">
              <BookOpen className="w-5 h-5 text-sky-700 mb-2" />
              <h3 className="font-heading font-semibold text-sm text-slate-900">Editorial Policy</h3>
              <Link to="/editorial-policy" className="text-sm text-sky-700 hover:underline">
                Read how we publish
              </Link>
            </div>
            <div className="rounded-lg border border-slate-200 p-5">
              <Award className="w-5 h-5 text-sky-700 mb-2" />
              <h3 className="font-heading font-semibold text-sm text-slate-900">Fact-Check Policy</h3>
              <Link to="/fact-check-policy" className="text-sm text-sky-700 hover:underline">
                How we verify and correct
              </Link>
            </div>
            <div className="rounded-lg border border-slate-200 p-5">
              <Mail className="w-5 h-5 text-sky-700 mb-2" />
              <h3 className="font-heading font-semibold text-sm text-slate-900">Contact</h3>
              <a
                href="mailto:suyash@bschoolbuzz.in"
                className="text-sm text-sky-700 hover:underline"
              >
                suyash@bschoolbuzz.in
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AuthorsPage;
