import { Link } from "react-router-dom";
import { HelpCircle, ChevronDown } from "lucide-react";

const ANSWERS = [
  {
    q: "Which MBA entrance exam should I take in 2026?",
    a: "Take CAT as your primary exam — it is accepted by all 21 IIMs and 1,200+ B-schools. Add XAT (XLRI), NMAT (NMIMS), SNAP (Symbiosis) and IIFT as backups so a single bad day does not end your season.",
  },
  {
    q: "What CAT percentile do I need for an IIM call?",
    a: "Older IIMs typically call at 98–99.5+ percentile, newer IIMs at 92–96, and good private B-schools at 85–92. Non-engineering, female and academically balanced profiles often convert at slightly lower cut-offs.",
  },
  {
    q: "Is MBA coaching necessary to crack CAT?",
    a: "Not mandatory, but structured coaching helps with sectional pacing and peer benchmarking. What actually decides your score is mock volume plus disciplined mock analysis — self-prep works if you can hold that routine.",
  },
  {
    q: "How much does an MBA in India cost?",
    a: "Top IIMs and ISB cost ₹23–40 lakh total, tier-1 private schools ₹12–24 lakh, and tier-2 schools ₹6–12 lakh. Always read the placement report alongside the fee before you commit.",
  },
  {
    q: "Is an MBA worth it after 3 years of work experience?",
    a: "Yes, if you want a function or industry switch. Candidates with 2–5 years of work-ex generally get better shortlists, stronger interview narratives and faster post-MBA promotions than freshers.",
  },
  {
    q: "Can I get an MBA seat without CAT?",
    a: "Yes. NMAT, SNAP, MAT, CMAT, ATMA, GMAT and state-level tests such as MAH-CET all lead to credible programmes, and many have multiple attempt windows in the same cycle.",
  },
];

/**
 * Answer-first Q&A block (AEO/GEO): short, direct, self-contained answers that
 * AI search engines can quote. Uses native details/summary — zero JS cost.
 */
const HomeQuickAnswers = () => (
  <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50/70 via-white to-white" id="home-quick-answers">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <HelpCircle className="h-3.5 w-3.5" /> Straight Answers
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          MBA questions, <span className="font-editorial italic text-primary">answered in one line</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          The six things every aspirant asks us first — no fluff, no upsell.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
        {ANSWERS.map(({ q, a }, i) => (
          <details
            key={q}
            open={i === 0}
            className="group rounded-2xl border border-primary/10 bg-white p-4 md:p-5 transition-colors open:border-primary/30 hover:border-primary/25"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <h3 className="font-heading text-sm md:text-base font-bold text-foreground leading-snug">{q}</h3>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Ask a mentor for free
        </Link>
      </div>
    </div>
  </section>
);

export default HomeQuickAnswers;
