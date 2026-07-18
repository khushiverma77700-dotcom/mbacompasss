import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Sparkles, ArrowRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CutoffRow = {
  college: string;
  slug: string;
  general: string;
  obc: string;
  sc: string;
  st: string;
  ews?: string;
  fees: string;
  avgCTC: string;
  intake?: string;
};

type ExamTab = {
  id: string;
  label: string;
  fullName: string;
  scoreLabel: string;
  window: string;
  note: string;
  rows: CutoffRow[];
};

const EXAMS: ExamTab[] = [
  {
    id: "cat",
    label: "CAT",
    fullName: "Common Admission Test",
    scoreLabel: "Percentile",
    window: "Nov 2025 · Results Jan 2026",
    note: "Sectional + overall percentile cutoffs across the top 20 CAT-accepting B-Schools.",
    rows: [
      { college: "IIM Ahmedabad", slug: "iim-ahmedabad", general: "99.0", obc: "90.0", sc: "70.0", st: "60.0", ews: "94.0", fees: "₹28.0 L", avgCTC: "₹34.5 LPA", intake: "395" },
      { college: "IIM Bangalore", slug: "iim-bangalore", general: "98.5", obc: "92.0", sc: "75.0", st: "65.0", ews: "95.5", fees: "₹27.5 L", avgCTC: "₹33.8 LPA", intake: "540" },
      { college: "IIM Calcutta", slug: "iim-calcutta", general: "98.5", obc: "90.0", sc: "72.0", st: "60.0", ews: "94.0", fees: "₹31.0 L", avgCTC: "₹33.0 LPA", intake: "480" },
      { college: "IIM Lucknow", slug: "iim-lucknow", general: "97.0", obc: "84.0", sc: "63.0", st: "55.0", ews: "89.0", fees: "₹21.5 L", avgCTC: "₹30.4 LPA", intake: "560" },
      { college: "IIM Kozhikode", slug: "iim-kozhikode", general: "97.0", obc: "85.0", sc: "70.0", st: "60.0", ews: "88.0", fees: "₹22.5 L", avgCTC: "₹31.0 LPA", intake: "540" },
      { college: "IIM Indore", slug: "iim-indore", general: "97.0", obc: "88.0", sc: "70.0", st: "56.0", ews: "89.0", fees: "₹21.0 L", avgCTC: "₹28.5 LPA", intake: "605" },
      { college: "FMS Delhi", slug: "fms-delhi", general: "98.5", obc: "92.0", sc: "80.0", st: "70.0", ews: "94.0", fees: "₹2.0 L", avgCTC: "₹34.3 LPA", intake: "252" },
      { college: "MDI Gurgaon", slug: "mdi-gurgaon", general: "95.0", obc: "80.0", sc: "60.0", st: "50.0", ews: "88.0", fees: "₹24.0 L", avgCTC: "₹27.5 LPA", intake: "400" },
      { college: "SPJIMR Mumbai", slug: "spjimr-mumbai", general: "85.0", obc: "82.0", sc: "80.0", st: "78.0", ews: "83.0", fees: "₹22.0 L", avgCTC: "₹32.5 LPA", intake: "240" },
      { college: "IIT Delhi (DMS)", slug: "dms-iit-delhi", general: "96.0", obc: "80.0", sc: "65.0", st: "50.0", ews: "88.0", fees: "₹10.4 L", avgCTC: "₹24.5 LPA", intake: "132" },
    ],
  },
  {
    id: "xat",
    label: "XAT",
    fullName: "Xavier Aptitude Test",
    scoreLabel: "Percentile",
    window: "Jan 2026 · Results Jan 2026",
    note: "XAT-accepting B-School cutoffs — XLRI, XIMB, IMT, TAPMI and more.",
    rows: [
      { college: "XLRI Jamshedpur (BM)", slug: "xlri-jamshedpur", general: "94.0", obc: "85.0", sc: "60.0", st: "45.0", ews: "88.0", fees: "₹27.5 L", avgCTC: "₹32.7 LPA", intake: "180" },
      { college: "XLRI Jamshedpur (HRM)", slug: "xlri-jamshedpur", general: "89.0", obc: "80.0", sc: "55.0", st: "40.0", ews: "84.0", fees: "₹27.5 L", avgCTC: "₹28.2 LPA", intake: "180" },
      { college: "XIM Bhubaneswar", slug: "xim-bhubaneswar", general: "90.0", obc: "80.0", sc: "55.0", st: "40.0", ews: "82.0", fees: "₹19.0 L", avgCTC: "₹15.2 LPA", intake: "300" },
      { college: "IMT Ghaziabad", slug: "imt-ghaziabad", general: "88.0", obc: "78.0", sc: "60.0", st: "50.0", ews: "82.0", fees: "₹20.5 L", avgCTC: "₹18.9 LPA", intake: "480" },
      { college: "TAPMI Manipal", slug: "tapmi-manipal", general: "85.0", obc: "78.0", sc: "60.0", st: "50.0", ews: "80.0", fees: "₹17.5 L", avgCTC: "₹14.5 LPA", intake: "540" },
      { college: "Great Lakes Chennai", slug: "great-lakes-chennai", general: "85.0", obc: "80.0", sc: "70.0", st: "60.0", ews: "82.0", fees: "₹24.9 L", avgCTC: "₹18.5 LPA", intake: "230" },
    ],
  },
  {
    id: "nmat",
    label: "NMAT",
    fullName: "NMIMS Management Aptitude Test",
    scoreLabel: "Score / 360",
    window: "Oct–Dec 2025 · 3 attempts",
    note: "NMIMS and NMAT-accepting schools. Scores are total out of 360.",
    rows: [
      { college: "NMIMS Mumbai (Core)", slug: "nmims-mumbai", general: "225", obc: "215", sc: "200", st: "185", fees: "₹23.5 L", avgCTC: "₹22.2 LPA", intake: "600" },
      { college: "NMIMS Mumbai (HR)", slug: "nmims-mumbai", general: "210", obc: "200", sc: "180", st: "170", fees: "₹23.5 L", avgCTC: "₹15.0 LPA", intake: "60" },
      { college: "NMIMS Bengaluru", slug: "nmims-bengaluru", general: "200", obc: "190", sc: "175", st: "160", fees: "₹19.5 L", avgCTC: "₹12.5 LPA", intake: "240" },
      { college: "NMIMS Hyderabad", slug: "nmims-hyderabad", general: "180", obc: "170", sc: "160", st: "150", fees: "₹18.0 L", avgCTC: "₹11.8 LPA", intake: "240" },
      { college: "SDA Bocconi Asia", slug: "sda-bocconi-asia", general: "200", obc: "190", sc: "180", st: "170", fees: "₹25.0 L", avgCTC: "₹15.5 LPA", intake: "120" },
      { college: "ISB PGP Pro", slug: "isb-hyderabad", general: "240", obc: "230", sc: "215", st: "200", fees: "₹41.8 L", avgCTC: "₹36.5 LPA", intake: "900" },
    ],
  },
  {
    id: "snap",
    label: "SNAP",
    fullName: "Symbiosis National Aptitude Test",
    scoreLabel: "Percentile",
    window: "Dec 2025 · 3 attempts",
    note: "Symbiosis institute cutoffs — SIBM, SCMHRD, SIIB.",
    rows: [
      { college: "SIBM Pune", slug: "sibm-pune", general: "98.5", obc: "92.0", sc: "80.0", st: "70.0", ews: "94.0", fees: "₹22.5 L", avgCTC: "₹26.5 LPA", intake: "180" },
      { college: "SCMHRD Pune", slug: "scmhrd-pune", general: "97.0", obc: "90.0", sc: "78.0", st: "68.0", ews: "92.0", fees: "₹20.0 L", avgCTC: "₹20.8 LPA", intake: "180" },
      { college: "SIIB Pune", slug: "siib-pune", general: "94.5", obc: "85.0", sc: "72.0", st: "62.0", ews: "88.0", fees: "₹18.5 L", avgCTC: "₹15.0 LPA", intake: "180" },
      { college: "SIBM Bengaluru", slug: "sibm-bengaluru", general: "94.0", obc: "84.0", sc: "70.0", st: "60.0", ews: "88.0", fees: "₹19.0 L", avgCTC: "₹14.5 LPA", intake: "180" },
      { college: "SIBM Hyderabad", slug: "sibm-hyderabad", general: "90.0", obc: "80.0", sc: "65.0", st: "55.0", ews: "84.0", fees: "₹17.5 L", avgCTC: "₹12.5 LPA", intake: "120" },
      { college: "SIOM Nashik", slug: "siom-nashik", general: "88.0", obc: "80.0", sc: "65.0", st: "55.0", ews: "82.0", fees: "₹15.5 L", avgCTC: "₹14.2 LPA", intake: "180" },
    ],
  },
  {
    id: "cmat",
    label: "CMAT",
    fullName: "Common Management Admission Test",
    scoreLabel: "Percentile",
    window: "Jan 2026 · Results Feb 2026",
    note: "AICTE's CMAT — accepted by 1000+ AICTE-approved institutes.",
    rows: [
      { college: "JBIMS Mumbai (CMAT)", slug: "jbims-mumbai", general: "99.9", obc: "99.5", sc: "97.0", st: "94.0", ews: "99.7", fees: "₹6.0 L", avgCTC: "₹32.2 LPA", intake: "120" },
      { college: "SIMSREE Mumbai", slug: "simsree-mumbai", general: "99.5", obc: "98.0", sc: "94.0", st: "90.0", ews: "99.0", fees: "₹1.5 L", avgCTC: "₹18.0 LPA", intake: "120" },
      { college: "K J Somaiya Mumbai", slug: "kj-somaiya-mumbai", general: "97.0", obc: "90.0", sc: "80.0", st: "70.0", ews: "92.0", fees: "₹17.5 L", avgCTC: "₹15.5 LPA", intake: "360" },
      { college: "GIM Goa", slug: "gim-goa", general: "94.0", obc: "85.0", sc: "72.0", st: "60.0", ews: "88.0", fees: "₹17.0 L", avgCTC: "₹13.2 LPA", intake: "360" },
      { college: "Welingkar Mumbai", slug: "welingkar-mumbai", general: "92.0", obc: "82.0", sc: "70.0", st: "60.0", ews: "86.0", fees: "₹9.5 L", avgCTC: "₹11.5 LPA", intake: "480" },
    ],
  },
  {
    id: "iift",
    label: "IIFT",
    fullName: "IIFT MBA (International Business) Entrance",
    scoreLabel: "Composite Score",
    window: "Dec 2025",
    note: "IIFT campus cutoffs for the flagship MBA (IB) programme.",
    rows: [
      { college: "IIFT Delhi", slug: "iift-delhi", general: "48.0", obc: "42.0", sc: "35.0", st: "28.0", ews: "45.0", fees: "₹19.5 L", avgCTC: "₹25.1 LPA", intake: "220" },
      { college: "IIFT Kolkata", slug: "iift-kolkata", general: "44.0", obc: "38.0", sc: "32.0", st: "25.0", ews: "40.0", fees: "₹19.5 L", avgCTC: "₹22.5 LPA", intake: "140" },
      { college: "IIFT Kakinada", slug: "iift-kakinada", general: "40.0", obc: "35.0", sc: "30.0", st: "22.0", ews: "38.0", fees: "₹19.5 L", avgCTC: "₹18.5 LPA", intake: "120" },
    ],
  },
];

const CATS: { key: keyof CutoffRow; label: string; tone?: string }[] = [
  { key: "general", label: "General", tone: "text-primary" },
  { key: "ews", label: "EWS", tone: "text-sky-700" },
  { key: "obc", label: "OBC", tone: "text-amber-700" },
  { key: "sc", label: "SC", tone: "text-emerald-700" },
  { key: "st", label: "ST", tone: "text-rose-700" },
];

export default function ExamCutoffsTable() {
  const [active, setActive] = useState(EXAMS[0].id);
  const [override, setOverride] = useState<ExamTab[] | null>(null);

  // Hydrate admin-managed rows from site_settings (managed via /admin/tables-manager).
  // Flat rows are merged into the matching EXAMS tab by `exam` id (case-insensitive).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_exam_cutoffs")
        .maybeSingle();
      const items: any[] = Array.isArray((data?.value as any)?.items) ? (data!.value as any).items : [];
      if (cancelled || items.length === 0) return;
      const byExam = new Map<string, CutoffRow[]>();
      for (const it of items) {
        const key = String(it?.exam || "").toLowerCase().trim();
        if (!key || !it?.college) continue;
        const arr = byExam.get(key) || [];
        arr.push({
          college: it.college,
          slug: it.slug || "",
          general: it.general || "",
          obc: it.obc || "",
          sc: it.sc || "",
          st: it.st || "",
          ews: it.ews || "",
          fees: it.fees || "",
          avgCTC: it.avgCTC || "",
          intake: it.intake || "",
        });
        byExam.set(key, arr);
      }
      const merged = EXAMS.map((e) => {
        const custom = byExam.get(e.id.toLowerCase());
        return custom && custom.length ? { ...e, rows: custom } : e;
      });
      setOverride(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  const exams = override || EXAMS;
  const current = exams.find((e) => e.id === active) || exams[0];

  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-sky-50/50 via-white to-sky-50/40">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Target className="w-3.5 h-3.5" /> Cut-offs 2026 · Category-wise
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3">
            Exact <span className="font-editorial italic text-primary">cut-offs</span> for every major MBA exam
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Category-wise closing cut-offs across CAT, XAT, NMAT, SNAP, CMAT and IIFT — audited from official prospectuses & 2025 admission reports.
          </p>
        </div>

        {/* Exam tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {exams.map((e) => (
            <button
              key={e.id}
              onClick={() => setActive(e.id)}
              className={`px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-all border ${
                active === e.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "bg-white text-foreground/70 border-primary/15 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Header strip */}
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
          <div>
            <div className="text-sm md:text-base font-bold text-foreground">{current.fullName}</div>
            <div className="text-xs text-muted-foreground">{current.window} · Score type: <span className="font-semibold text-primary">{current.scoreLabel}</span></div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5" /> {current.note}
          </div>
        </div>

        {/* Table */}
        <div className="max-w-6xl mx-auto rounded-2xl border border-primary/10 bg-white shadow-[0_10px_40px_-15px_rgba(14,165,233,0.2)] overflow-x-auto">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_0.9fr] gap-3 px-5 py-3 bg-sky-50/70 border-b border-primary/10 text-[11px] font-bold uppercase tracking-wider text-primary/80 sticky top-0">
            <div>B-School</div>
            <div className="text-center">General</div>
            <div className="text-center">EWS</div>
            <div className="text-center">OBC</div>
            <div className="text-center">SC</div>
            <div className="text-center">ST</div>
            <div>Fees</div>
            <div>Avg CTC</div>
          </div>

          {current.rows.map((row, i) => (
            <div
              key={`${row.slug}-${i}`}
              className="grid grid-cols-1 md:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_0.9fr] gap-2 md:gap-3 px-4 md:px-5 py-3.5 md:py-4 border-b border-primary/5 last:border-0 hover:bg-sky-50/60 transition-colors"
            >
              <Link to={`/college/${row.slug}`} className="min-w-0 group">
                <div className="font-bold text-foreground text-sm md:text-[15px] group-hover:text-primary transition-colors truncate">
                  {row.college}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {row.intake && <>Intake · {row.intake}</>} {row.intake && "·"} Closing {current.scoreLabel.toLowerCase()}
                </div>
              </Link>

              {/* Mobile category pills */}
              <div className="md:hidden grid grid-cols-5 gap-1.5 mt-1">
                {CATS.map((c) => {
                  const val = (row as any)[c.key];
                  if (!val) return null;
                  return (
                    <div key={c.key} className="rounded-lg bg-sky-50/70 border border-primary/10 px-1.5 py-1 text-center">
                      <div className="text-[9px] font-bold uppercase text-muted-foreground">{c.label}</div>
                      <div className={`text-xs font-extrabold ${c.tone}`}>{val}</div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop cells */}
              <div className="hidden md:flex items-center justify-center text-sm font-extrabold text-primary">{row.general}</div>
              <div className="hidden md:flex items-center justify-center text-sm font-semibold text-sky-700">{row.ews || "—"}</div>
              <div className="hidden md:flex items-center justify-center text-sm font-semibold text-amber-700">{row.obc}</div>
              <div className="hidden md:flex items-center justify-center text-sm font-semibold text-emerald-700">{row.sc}</div>
              <div className="hidden md:flex items-center justify-center text-sm font-semibold text-rose-700">{row.st}</div>

              <div className="md:flex items-center hidden text-sm font-semibold text-foreground/80">{row.fees}</div>
              <div className="md:flex items-center hidden text-sm font-bold text-emerald-700">{row.avgCTC}</div>

              <div className="md:hidden flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-primary/5">
                <span>Fees · <span className="font-semibold text-foreground/80">{row.fees}</span></span>
                <span>Avg CTC · <span className="font-bold text-emerald-700">{row.avgCTC}</span></span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 mt-5 px-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Cut-offs vary each cycle; treat as directional benchmarks, not admission guarantees.
          </div>
          <Link to="/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            Compare all exams & cut-offs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
