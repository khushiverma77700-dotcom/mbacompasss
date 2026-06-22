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

const TYPE_HUBS: Record<string, { label: string; title: string; match: (c: any) => boolean; intro: string }> = {
  iim: {
    label: "IIM Colleges",
    title: "IIM Colleges in India 2026 — Full List, CAT Cut-offs, Fees & Placements | MBA Compass",
    match: (c) => /iim/i.test(c.name || "") || c.type === "IIM",
    intro: "The Indian Institutes of Management (IIMs) are India's flagship public business schools, set up under the IIM Act 2017 and ranked among the toughest MBA programmes in the world to crack. This page lists every IIM — older (Ahmedabad, Bangalore, Calcutta, Lucknow, Indore, Kozhikode), new (Shillong, Rohtak, Ranchi, Raipur, Trichy, Udaipur, Kashipur) and baby (Amritsar, Bodh Gaya, Nagpur, Sambalpur, Sirmaur, Visakhapatnam, Jammu, Mumbai) — with CAT cut-offs, fees, average and highest packages, sectional weightages and category-wise admission criteria so you can shortlist where to apply.",
  },
  private: {
    label: "Private MBA Colleges",
    title: "Top Private MBA Colleges in India 2026 — Fees, Placements & Admissions | MBA Compass",
    match: (c) => /private/i.test(c.college_category || "") || /private/i.test(c.type || ""),
    intro: "Private B-schools account for the bulk of India's quality MBA seats outside the IIMs. The list below covers institutes accepting CAT, XAT, NMAT, SNAP, CMAT, IIFT and MAT — including XLRI, SPJIMR, MDI, IMI, IMT, NMIMS, Symbiosis, Great Lakes, TAPMI and the BITSoM/Masters' Union cohort. Each card shows total fees, placement record, accepted exams and last year's cut-offs so you can map the right institute to your profile and budget.",
  },
  "top-mba": {
    label: "Top MBA Colleges",
    // Retargeted away from /colleges (directory) to target NIRF-ranking intent specifically.
    title: "Top 100 MBA Colleges in India 2026 — NIRF Ranking, Average Package & Cut-offs",
    match: (c) => (c.tier === "Tier 1" || c.tier === "Tier 2") && (c.ranking ?? 9999) <= 100,
    intro: "The top 100 MBA colleges in India ranked by NIRF Management, recruiter perception and 3-year placement consistency. The list combines IIMs, FMS Delhi, XLRI Jamshedpur, SPJIMR, MDI Gurgaon, IIFT, NMIMS Mumbai, IIT business schools (DMS IIT Delhi, VGSoM IIT Kharagpur, DoMS IIT Madras), JBIMS, MICA and the leading new-age private universities. Compare average package, sectoral hiring split, percentile cut-offs and total fees side by side to build a balanced apply-list across moonshot, target and safety schools.",
  },
  pgdm: {
    label: "PGDM Colleges in India",
    title: "Top PGDM Colleges in India 2026 — AICTE-Approved Institutes, Fees & Placements | MBA Compass",
    match: (c) => /pgdm/i.test(c.type || "") || /pgdm/i.test(c.college_category || ""),
    intro: "PGDM (Post-Graduate Diploma in Management) is the autonomous, AICTE-approved cousin of the MBA — usually more industry-aligned because the curriculum doesn't need university approval to update. This page lists every notable PGDM institute (MDI, IMT, IMI, Great Lakes, TAPMI, IFMR, Welingkar, KJ Somaiya, BIMTECH) with fees, accepted exams, NBA accreditation status and median placement so you can judge whether a PGDM gives you a better ROI than a traditional 2-year MBA.",
  },
  university: {
    label: "University MBA Programmes",
    title: "University MBA Programmes in India 2026 — UGC-Recognised, NAAC-Accredited | MBA Compass",
    match: (c) => /university/i.test(c.type || "") || /university/i.test(c.name || ""),
    intro: "MBA degrees from UGC-recognised universities are the most widely accepted credential for government jobs, PSU recruitment and global higher studies. Below are central, state and deemed universities offering full-time MBA, including DU FMS, JNU, BHU, Pondicherry University, AMU, Jamia Millia, Delhi Technological University and Anna University. Each entry shows NAAC grade, total fees, entrance exam and last-year cut-off so you can compare value against private alternatives.",
  },
  government: {
    label: "Government MBA Colleges",
    title: "Government MBA Colleges in India 2026 — Low Fees, Top Placements | MBA Compass",
    match: (c) => /government|public|state|central/i.test(c.college_category || "") || /iim|nit|iit|ji?ii?t|fms/i.test(c.name || ""),
    intro: "Government-funded MBA colleges deliver the best ROI in Indian management education — fees typically range Rs 2–25 lakh against Rs 15–30 lakh at top private peers, while placements rival the best private B-schools. This list aggregates IIMs, IIT business schools, NIT management departments, FMS Delhi, JBIMS, DFS DU and state-government MBAs with category-wise cut-offs, total fees, average package and recruiter mix so you can identify the highest-value targets for your CAT/XAT/CMAT score.",
  },
};

const EXAM_HUBS: Record<string, { label: string; canonical: string[]; intro: string }> = {
  cat: {
    label: "CAT",
    canonical: ["CAT"],
    intro: "The Common Admission Test (CAT) is the gateway to 21 IIMs and 1,200+ other Indian B-schools. The colleges below accept CAT scores; each card lists last year's percentile cut-off (overall plus sectional), fees, average package, accepted alternative exams and seat intake so you can map percentile bands to realistic targets, safeties and stretch options.",
  },
  xat: {
    label: "XAT",
    canonical: ["XAT"],
    intro: "The Xavier Aptitude Test (XAT) is conducted by XLRI Jamshedpur and accepted by 160+ B-schools including XLRI, XIMB, IMT, TAPMI, Great Lakes, MICA and SPJIMR (for PGDM-BM). Use the list below to compare XAT cut-offs, decision-making sectional importance, fees and placement track records so you can finalise your XAT apply-list before the December deadline.",
  },
  cmat: {
    label: "CMAT",
    canonical: ["CMAT"],
    intro: "Common Management Admission Test (CMAT) is the NTA-conducted entrance for AICTE-approved PGDM/MBA programmes. Below are the institutes that accept CMAT scores — JBIMS, SIMSREE, KJ Somaiya, Welingkar, Great Lakes, BIMTECH and the Maharashtra/Gujarat state quotas — with cut-offs, fees and placement data to help mid-percentile candidates build a realistic shortlist beyond the CAT pool.",
  },
  mat: {
    label: "MAT",
    canonical: ["MAT"],
    intro: "Management Aptitude Test (MAT) is conducted four times a year by AIMA and accepted by 600+ B-schools across India. The list below covers the meaningful MAT-accepting institutes — IPE Hyderabad, NDIM, Amity, Christ University, Galgotias, Asia Pacific Institute of Management — with fees, cut-off percentiles and accepted CAT/XAT alternatives so you can decide whether MAT is your primary or fall-back exam.",
  },
  nmat: {
    label: "NMAT",
    canonical: ["NMAT", "NMAT by GMAC"],
    intro: "NMAT by GMAC is the entrance exam owned by Graduate Management Admission Council and the gateway to NMIMS Mumbai plus ISB Hyderabad's Certificate in Business Analytics, SPJIMR PGMPW, VIT, Woxsen and ICFAI. The list below shows every NMAT-accepting B-school with score cut-offs (recall: NMAT scaled out of 360), fees, placement record and accepted alternative exams.",
  },
  snap: {
    label: "SNAP",
    canonical: ["SNAP"],
    intro: "The Symbiosis National Aptitude (SNAP) test is the entrance for all 15 Symbiosis institutes — SIBM Pune, SCMHRD, SIIB, SIBM Bengaluru, SIBM Hyderabad, SIBM Nagpur, SIOM Nashik and others. Below is the consolidated Symbiosis list with cut-off percentiles, programme fees, accepted alternative exams and the latest placement data to help you allocate your three SNAP attempts wisely.",
  },
  iift: {
    label: "IIFT",
    canonical: ["IIFT"],
    intro: "IIFT entrance is conducted by NTA on behalf of the Indian Institute of Foreign Trade for its flagship MBA (IB) programme across Delhi, Kolkata and Kakinada campuses. The list below shows IIFT plus the handful of B-schools that historically accept IIFT scores, with cut-off pattern (IIFT marks both quant and verbal heavily) and placement-by-sector breakdowns.",
  },
  gmat: {
    label: "GMAT",
    canonical: ["GMAT"],
    intro: "GMAT (Graduate Management Admission Test) is the international standard for MBA admissions, accepted by ISB, IIM PGPX/EPGP one-year programmes, SPJIMR PGMPW, Great Lakes One-Year and global B-schools. The list below filters Indian B-schools that accept GMAT scores with their typical score band, eligible programmes (mostly 1-year/executive) and average package data.",
  },
  atma: {
    label: "ATMA",
    canonical: ["ATMA"],
    intro: "AIMS Test for Management Admissions (ATMA) is conducted multiple times a year by the Association of Indian Management Schools. The list below shows institutes accepting ATMA scores — primarily AIMS-member B-schools across South and West India — with cut-offs, programme fees and placement profile.",
  },
};

const CITY_INTROS: Record<string, string> = {
  mumbai: "Mumbai is the financial capital of India and the country's deepest MBA recruiter market — every Indian and global investment bank, consulting firm and FMCG headquarters has an office here. The MBA colleges below include JBIMS, SPJIMR, NMIMS, KJ Somaiya, Welingkar, SIES, NL Dalmia and the Symbiosis Mumbai campuses, with fees, accepted exams, average packages and sectoral hiring split so you can pick the institute that best matches your career intent.",
  delhi: "Delhi NCR concentrates the largest cluster of top MBA colleges in India — FMS, MDI Gurgaon, IIFT, IMI, IMT Ghaziabad, FORE, DMS IIT Delhi, BIMTECH, DSE and Jamia Millia — backed by deep consulting, BFSI, FMCG and analytics recruiter pools. The list below covers every meaningful B-school in Delhi, Gurgaon, Noida, Faridabad and Ghaziabad with cut-offs, fees and placement record.",
  bangalore: "Bangalore is India's tech, startup and analytics capital, and the MBA colleges below — IIM Bangalore, XIME, IFIM, Christ University, Acharya Bangalore B-School, Alliance and ISBR — feed directly into product-management, analytics, tech-consulting and venture-capital roles. Each card shows fees, accepted exams, average package and recruiter mix to help you match programme to career path.",
  hyderabad: "Hyderabad is home to ISB — India's top-ranked B-school in the FT Global MBA rankings — alongside IPE Osmania, ICFAI Business School, Symbiosis Hyderabad and Woxsen. The city is a magnet for tech, pharma, consulting and product-management recruiters, and the list below details fees, exams accepted, intake and placement performance for every notable institute.",
  pune: "Pune hosts one of India's strongest MBA ecosystems — SIBM Pune, SCMHRD, SIIB, MIT-WPU, ISB&M, IndSearch, Welingkar Pune and the Symbiosis Lavale cluster — with deep ties to manufacturing, IT services, automotive and BFSI recruiters. The list below covers every Pune MBA programme by fees, entrance exam, intake and placement record.",
  chennai: "Chennai's MBA scene is anchored by IIM Trichy (campus in Trichy, recruitment via Chennai), Great Lakes Institute of Management, LIBA, SSN School of Management, MOP Vaishnav and the Anna University DoMS. Recruiters skew toward IT services, BFSI and manufacturing; the list below shows fees, accepted exams, intake and latest placement medians for each institute.",
  kolkata: "Kolkata's MBA colleges include IIM Calcutta (XLRI Jamshedpur is nearby) plus IISWBM, Calcutta Business School, Praxis Business School, IMI Kolkata and Globsyn. The city remains a strong recruiter for consulting (BCG Kolkata practice), BFSI and manufacturing. Each card below lists fees, accepted exams and placement record.",
  ahmedabad: "Ahmedabad is best known for IIM Ahmedabad — India's most consistently top-ranked B-school — and MICA (Mudra Institute of Communications). The list below also covers Nirma Institute of Management, EDII, Karnavati University and Pandit Deendayal Energy University with fees, entrance exam and placement breakdowns.",
  gurgaon: "Gurgaon (officially Gurugram) is India's corporate-headquarters belt and home to MDI Gurgaon, IMT Ghaziabad's Gurgaon centre, GD Goenka, BML Munjal and the Apeejay Stya cluster. Recruiters concentrate in consulting, e-commerce, BFSI and digital — see the list below for fees, accepted exams and placement medians at every Gurgaon B-school.",
  noida: "Noida hosts IMT Ghaziabad's adjacent campus, FORE School of Management's Noida extension, JIMS, Asian Business School, IILM and Amity Business School. The list below shows fees, entrance exam, intake and recruiter mix — heavy on IT services, BFSI and e-commerce — for every notable Noida MBA programme.",
  jaipur: "Jaipur is the educational hub of Rajasthan; MBA colleges include IIM Udaipur (campus in Udaipur, recruits in Jaipur), Manipal University Jaipur, JECRC University, IIS University and IILM Jaipur. The list below covers fees, accepted exams and placement record for every Jaipur B-school.",
  indore: "Indore is home to IIM Indore — one of the six older IIMs — alongside Prestige Institute of Management, Devi Ahilya Vishwavidyalaya's IMS and Renaissance University. The list below shows every Indore MBA programme with fees, entrance exam, intake and latest placement medians.",
  lucknow: "Lucknow hosts IIM Lucknow — the third-oldest IIM — and the IIM Lucknow Noida campus, plus Jaipuria Institute of Management, IBS Lucknow, Amity University and Babu Banarasi Das University. The list below covers fees, accepted exams and placement breakdowns for every Lucknow B-school.",
  chandigarh: "Chandigarh and the surrounding Tricity region (Mohali, Panchkula) host University Business School (UBS) Panjab University, Chitkara Business School, Chandigarh University and PEC. The list below shows fees, entrance exam, intake and recruiter mix for every Tricity MBA programme.",
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
        title: hub.title,
        h1: `${hub.label} in India (2026)`,
        intro: hub.intro,
        filtered: list,
      };
    }
    if (kind === "city") {
      const city = slug.replace(/-/g, " ");
      const list = colleges.filter((c: any) => slugify(c.city || "") === slug);
      const label = list[0]?.city || (city.charAt(0).toUpperCase() + city.slice(1));
      const editorial = CITY_INTROS[slug];
      return {
        title: `MBA Colleges in ${label} 2026 — Rankings, Fees, Cut-offs & Placements | MBA Compass`,
        h1: `MBA Colleges in ${label}`,
        intro: editorial || `Explore every MBA, PGDM and management programme in ${label}. Compare colleges by ranking, fees, entrance exam and placement record.`,
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
      title: `MBA Colleges Accepting ${hub.label} Score 2026 — Cut-offs, Fees & Placements | MBA Compass`,
      h1: `MBA Colleges Accepting ${hub.label} Score`,
      intro: hub.intro,
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
