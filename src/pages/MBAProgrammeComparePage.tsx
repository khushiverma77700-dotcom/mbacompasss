import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, GraduationCap, ExternalLink, ShieldCheck, ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/SEOHead";
import { useAllProgrammeCourses } from "@/hooks/useProgrammeCourses";

type Row = any;

const examLabels = (p: Row) => {
  const arr: string[] = [];
  if (p.accepts_cat) arr.push("CAT");
  if (p.accepts_xat) arr.push("XAT");
  if (p.accepts_gmat) arr.push("GMAT");
  if (p.accepts_gre) arr.push("GRE");
  if (p.accepts_cmat) arr.push("CMAT");
  if (p.accepts_nmat) arr.push("NMAT");
  if (p.accepts_snap) arr.push("SNAP");
  if (p.accepts_iift) arr.push("IIFT");
  return arr;
};

const cardColors = ["139, 92, 246", "59, 130, 246", "16, 185, 129"];

const MBAProgrammeComparePage = () => {
  const { data: programmes = [], isLoading } = useAllProgrammeCourses();
  const [params] = useSearchParams();
  const fromCollege = params.get("from");
  const [selected, setSelected] = useState<[Row | null, Row | null, Row | null]>([null, null, null]);

  // Auto-prefill from ?from=collegeSlug
  useEffect(() => {
    if (!fromCollege || !programmes.length) return;
    const fromCollegeRows = programmes.filter((p: any) => p.colleges?.slug === fromCollege).slice(0, 3);
    if (fromCollegeRows.length) {
      setSelected([fromCollegeRows[0] || null, fromCollegeRows[1] || null, fromCollegeRows[2] || null]);
    }
  }, [fromCollege, programmes]);

  const set = (i: number, val: Row | null) => {
    setSelected((prev) => {
      const next = [...prev] as typeof prev;
      next[i] = val;
      return next;
    });
  };

  const active = selected.filter(Boolean) as Row[];

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const p of programmes as any[]) {
      const key = p.colleges?.name || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [programmes]);

  const rows = useMemo(
    () => [
      { label: "College", get: (p: Row) => p.colleges?.name || "—" },
      { label: "Type", get: (p: Row) => p.programme_type },
      { label: "Duration", get: (p: Row) => p.duration || "—" },
      { label: "Mode", get: (p: Row) => p.mode || "—" },
      { label: "Total Fees", get: (p: Row) => p.fees_total_lakhs ? `₹${p.fees_total_lakhs} L (${p.fees_year || "—"})` : "—" },
      { label: "Min Graduation %", get: (p: Row) => p.min_graduation_percent ? `${p.min_graduation_percent}%` : "—" },
      { label: "Accepted Exams", get: (p: Row) => examLabels(p).join(", ") || "Profile-based" },
      { label: "CAT Target", get: (p: Row) => p.cat_percentile_target || "—" },
      { label: "XAT Target", get: (p: Row) => p.xat_percentile_target || "—" },
      { label: "GMAT Target", get: (p: Row) => p.gmat_score_target || "—" },
      { label: "Min Work-Ex", get: (p: Row) => p.min_work_ex_months ? `${Math.round(p.min_work_ex_months / 12)} yrs` : "Not required" },
      { label: "Intake Seats", get: (p: Row) => p.intake_seats ? `${p.intake_seats}` : "—" },
      { label: "Specialisations", get: (p: Row) => Array.isArray(p.specializations) ? p.specializations.slice(0, 5).join(", ") : "—" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Compare MBA Programmes — Fees, Eligibility & Specialisations"
        description="Compare up to 3 MBA programmes from India's top B-schools. See fees, eligibility, accepted exams (CAT/XAT/GMAT), work-ex requirements and specialisations side by side."
        canonical="https://mbacompass.in/compare/programmes"
        keywords={["compare MBA programmes", "MBA fees comparison", "PGP vs PGPX", "IIM MBA comparison", "best MBA programme India"]}
      />

      <header className="hero-gradient py-10 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4">
            <Link to="/compare"><ArrowLeft className="w-4 h-4 mr-2" /> Back to coaching compare</Link>
          </Button>
          <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 mb-3 text-xs">
            <Scale className="w-3.5 h-3.5 mr-1.5" /> MBA Programme Compare
          </Badge>
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground">Compare MBA Programmes</h1>
          <p className="text-primary-foreground/70 mt-3 max-w-xl mx-auto text-sm md:text-base">
            Stack up to 3 MBA / PGP / Executive MBA programmes side by side — fees, eligibility, accepted exams and specialisations from source-verified data.
          </p>
        </div>
      </header>

      <section className="container mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {[0, 1, 2].map((i) => (
            <Card key={i} className={`transition-all ${selected[i] ? "border-primary/40 shadow-md" : "border-dashed border-muted-foreground/30"}`}>
              {selected[i] && (
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, rgba(${cardColors[i]}, 0.8), rgba(${cardColors[i]}, 0.3))` }} />
              )}
              <CardContent className="pt-5 pb-5">
                <AnimatePresence mode="wait">
                  {selected[i] ? (
                    <motion.div key="sel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                      <button
                        onClick={() => set(i, null)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-primary-foreground font-bold text-lg" style={{ background: `linear-gradient(135deg, rgba(${cardColors[i]}, 0.9), rgba(${cardColors[i]}, 0.5))` }}>
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="font-heading font-bold text-foreground text-sm leading-tight">{selected[i]!.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{selected[i]!.colleges?.name}</div>
                        {selected[i]!.fees_total_lakhs && (
                          <div className="font-heading font-bold text-xl mt-2" style={{ color: `rgba(${cardColors[i]}, 1)` }}>
                            ₹{selected[i]!.fees_total_lakhs} L
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-3 border-2 border-dashed flex items-center justify-center" style={{ borderColor: `rgba(${cardColors[i]}, 0.3)`, background: `rgba(${cardColors[i]}, 0.05)` }}>
                        <Plus className="w-6 h-6" style={{ color: `rgba(${cardColors[i]}, 0.6)` }} />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Select Programme {i + 1}</p>
                      <Select
                        onValueChange={(v) => {
                          const found = (programmes as any[]).find((p) => p.id === v);
                          set(i, found || null);
                        }}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder={isLoading ? "Loading…" : "Choose a programme…"} /></SelectTrigger>
                        <SelectContent className="max-h-80 z-50">
                          {grouped.map(([collegeName, items]) => (
                            <div key={collegeName}>
                              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/40">{collegeName}</div>
                              {items.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className="text-sm">
                                  {p.short_name || p.name}
                                  {p.fees_total_lakhs && <span className="text-xs text-muted-foreground ml-2">₹{p.fees_total_lakhs} L</span>}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                          {!grouped.length && (
                            <div className="p-4 text-xs text-muted-foreground">
                              No verified programmes yet. Generate Courses & Fees in admin to populate.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>

        {active.length >= 2 && (
          <Card className="overflow-hidden border-border/60 shadow-md">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" /> Side-by-side comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Attribute</th>
                      {active.map((p) => (
                        <th key={p.id} className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">
                          {p.short_name || p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-b border-border">
                        <td className="py-3 px-3 font-medium text-muted-foreground">{r.label}</td>
                        {active.map((p) => (
                          <td key={p.id} className="py-3 px-3 text-foreground">{r.get(p) || "—"}</td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 px-3 font-medium text-muted-foreground">Source</td>
                      {active.map((p) => (
                        <td key={p.id} className="py-3 px-3">
                          {p.source_url ? (
                            <a href={p.source_url} target="_blank" rel="noreferrer noopener nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verify <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : "—"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {active.length < 2 && (
          <div className="text-center py-12 text-muted-foreground">
            Pick at least 2 programmes to see the side-by-side comparison.
          </div>
        )}
      </section>
    </div>
  );
};

export default MBAProgrammeComparePage;
