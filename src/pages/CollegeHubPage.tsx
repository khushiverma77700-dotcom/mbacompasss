/**
 * H5 — SEO hub pages for college discovery.
 *
 * Renders an indexable landing page that groups colleges by:
 *   /colleges/type/:typeSlug      — IIM | private | top-mba | pgdm | university | government
 *   /colleges/by-city/:citySlug   — mumbai, delhi, bangalore, …
 *   /colleges/by-exam/:examSlug   — cat, xat, cmat, mat, nmat, snap, …
 *
 * Each hub has a unique H1, intro paragraph (SEO copy), filtered listing,
 * BreadcrumbList + ItemList JSON-LD, and cross-hub internal links — so
 * Google sees concentrated, topical authority instead of one giant listing.
 */
import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Building2, MapPin, GraduationCap, ChevronRight, Award } from "lucide-react";
import { useColleges } from "@/hooks/useInstitutes";
import SEOHead from "@/components/SEOHead";
import CollegeListingCard from "@/components/CollegeListingCard";

type HubKind = "type" | "city" | "exam";

const TYPE_HUBS: Record<string, { label: string; match: (c: any) => boolean; intro: string }> = {
  iim: {
    label: "IIM Colleges",
    match: (c) => /iim/i.test(c.name || "") || c.type === "IIM",
    intro: "Indian Institutes of Management (IIMs) are India's flagship public business schools. Compare every IIM by ranking, fees, placements and CAT cut-offs in one place.",
  },
  private: {
    label: "Private MBA Colleges",
    match: (c) => /private/i.test(c.college_category || "") || /private/i.test(c.type || ""),
    intro: "Top private B-schools in India offering 2-year MBA / PGDM programmes. Curated by ranking, fees and placement outcomes.",
  },
  "top-mba": {
    label: "Top MBA Colleges in India",
    match: (c) => (c.tier === "Tier 1" || c.tier === "Tier 2") && (c.ranking ?? 9999) <= 100,
    intro: "Tier-1 and Tier-2 MBA colleges ranked by placement consistency, salary, and academic strength. The benchmark list for serious aspirants.",
  },
  pgdm: {
    label: "PGDM Colleges in India",
    match: (c) => /pgdm/i.test(c.type || "") || /pgdm/i.test(c.college_category || ""),
    intro: "AICTE-approved PGDM institutes offering autonomous, industry-aligned curricula. Compare by fees, placements and accreditation.",
  },
  university: {
    label: "University MBA Programmes",
    match: (c) => /university/i.test(c.type || "") || /university/i.test(c.name || ""),
    intro: "MBA degrees from UGC-recognised universities — affordable, NAAC-accredited, and widely accepted for government and PSU roles.",
  },
  government: {
    label: "Government MBA Colleges",
    match: (c) => /government|public|state|central/i.test(c.college_category || "") || /iim|nit|iit|ji?ii?t|fms/i.test(c.name || ""),
    intro: "Government MBA colleges with subsidised fees and strong placement records — the most cost-efficient route to a quality MBA.",
  },
};

const EXAM_HUBS: Record<string, { label: string; canonical: string[] }> = {
  cat:   { label: "CAT", canonical: ["CAT"] },
  xat:   { label: "XAT", canonical: ["XAT"] },
  cmat:  { label: "CMAT", canonical: ["CMAT"] },
  mat:   { label: "MAT", canonical: ["MAT"] },
  nmat:  { label: "NMAT", canonical: ["NMAT", "NMAT by GMAC"] },
  snap:  { label: "SNAP", canonical: ["SNAP"] },
  iift:  { label: "IIFT", canonical: ["IIFT"] },
  gmat:  { label: "GMAT", canonical: ["GMAT"] },
  atma:  { label: "ATMA", canonical: ["ATMA"] },
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Props {
  kind: HubKind;
}

const CollegeHubPage = ({ kind }: Props) => {
  const params = useParams<{ typeSlug?: string; citySlug?: string; examSlug?: string }>();
  const slug = (params.typeSlug || params.citySlug || params.examSlug || "").toLowerCase();
  const { data: colleges = [], isLoading } = useColleges();

  const { title, h1, intro, filtered } = useMemo(() => {
    if (kind === "type") {
      const hub = TYPE_HUBS[slug];
      if (!hub) return { title: "", h1: "", intro: "", filtered: [] as any[] };
      const list = colleges.filter(hub.match);
      return {
        title: `${hub.label} 2026 — Rankings, Fees & Placements | MBA Compass`,
        h1: `${hub.label} in India (2026)`,
        intro: hub.intro,
        filtered: list,
      };
    }
    if (kind === "city") {
      const city = slug.replace(/-/g, " ");
      const list = colleges.filter((c: any) => slugify(c.city || "") === slug);
      const label = list[0]?.city || (city.charAt(0).toUpperCase() + city.slice(1));
      return {
        title: `MBA Colleges in ${label} — Rankings, Fees & Placements | MBA Compass`,
        h1: `MBA Colleges in ${label}`,
        intro: `Explore every MBA, PGDM and management programme in ${label}. Compare colleges by ranking, fees, entrance exam and placement record.`,
        filtered: list,
      };
    }
    // exam
    const hub = EXAM_HUBS[slug];
    if (!hub) return { title: "", h1: "", intro: "", filtered: [] as any[] };
    const list = colleges.filter((c: any) =>
      (c.exams_accepted || []).some((e: string) =>
        hub.canonical.some((needle) => e.toUpperCase().includes(needle))
      )
    );
    return {
      title: `MBA Colleges Accepting ${hub.label} 2026 — Cut-offs, Fees & Placements`,
      h1: `MBA Colleges Accepting ${hub.label} Score`,
      intro: `Complete list of MBA / PGDM colleges that accept ${hub.label} scores for admission. Compare cut-offs, fees and placement outcomes.`,
      filtered: list,
    };
  }, [kind, slug, colleges]);

  if (!isLoading && filtered.length === 0 && (kind !== "city")) {
    // Unknown type/exam slug → real 404 (noindex)
    return <Navigate to="/not-found" replace />;
  }

  const canonical = `https://mbacompass.in/colleges/${kind === "type" ? "type" : kind === "city" ? "by-city" : "by-exam"}/${slug}`;

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in/" },
          { "@type": "ListItem", position: 2, name: "Colleges", item: "https://mbacompass.in/colleges" },
          { "@type": "ListItem", position: 3, name: h1, item: canonical },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: h1,
        numberOfItems: filtered.length,
        itemListElement: filtered.slice(0, 50).map((c: any, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://mbacompass.in/college/${c.slug}`,
          name: c.name,
        })),
      },
    ],
    [h1, canonical, filtered]
  );

  const otherHubs = kind === "type"
    ? Object.entries(TYPE_HUBS).filter(([k]) => k !== slug).slice(0, 5)
    : kind === "exam"
    ? Object.entries(EXAM_HUBS).filter(([k]) => k !== slug).slice(0, 6)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={title} description={intro} canonical={canonical} jsonLd={jsonLd} />

      <div className="relative py-12 md:py-16" style={{ background: "hsl(207 90% 54%)" }}>
        <div className="container mx-auto px-4 relative z-10">
          <nav className="text-sm text-white/80 mb-4 flex items-center gap-1.5">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/colleges" className="hover:text-white">Colleges</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white">{h1}</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">{h1}</h1>
          <p className="text-white/90 max-w-3xl text-base md:text-lg">{intro}</p>
          <p className="text-white/70 text-sm mt-3">{filtered.length} college{filtered.length === 1 ? "" : "s"} found</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="text-muted-foreground">Loading colleges…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((c: any, i: number) => (
              <CollegeListingCard key={c.id} college={c} index={i} rank={i + 1} />
            ))}
          </div>
        )}

        {otherHubs.length > 0 && (
          <section className="mt-16 border-t pt-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              {kind === "exam" ? <Award className="w-6 h-6 text-primary" /> : <Building2 className="w-6 h-6 text-primary" />}
              Explore other {kind === "exam" ? "exams" : "categories"}
            </h2>
            <div className="flex flex-wrap gap-3">
              {otherHubs.map(([k, v]: any) => (
                <Link
                  key={k}
                  to={kind === "type" ? `/colleges/type/${k}` : `/colleges/by-exam/${k}`}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors text-sm font-medium"
                >
                  {v.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {kind !== "city" && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" /> Top MBA cities
            </h2>
            <div className="flex flex-wrap gap-3">
              {["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad"].map((city) => (
                <Link
                  key={city}
                  to={`/colleges/by-city/${slugify(city)}`}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors text-sm font-medium"
                >
                  MBA in {city}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CollegeHubPage;
