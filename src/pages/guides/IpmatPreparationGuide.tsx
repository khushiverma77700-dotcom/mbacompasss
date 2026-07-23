import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Target, BookOpen, Calendar, GraduationCap, TrendingUp, School, Clock } from "lucide-react";

/**
 * Editorial guide targeting the "IPMAT preparation" query cluster.
 * Purely presentational — no data fetching, so it renders instantly and
 * the ssr-prerender template serves the same title/description to crawlers.
 */
const IpmatPreparationGuide = () => {
  useEffect(() => {
    document.title = "IPMAT Preparation Guide 2026 — Syllabus, Pattern & Strategy | MBA Compass";
  }, []);

  const sections = [
    { id: "what-is-ipmat", label: "What is IPMAT" },
    { id: "eligibility", label: "Eligibility" },
    { id: "pattern", label: "Exam Pattern" },
    { id: "syllabus", label: "Syllabus" },
    { id: "strategy", label: "Preparation Strategy" },
    { id: "coaching", label: "Top Coaching" },
    { id: "colleges", label: "IPM Colleges" },
    { id: "faq", label: "FAQs" },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <header className="bg-gradient-to-br from-sky-50 via-white to-blue-50 border-b border-sky-100">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-sky-600">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/exams" className="hover:text-sky-600">Exams</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700 font-medium">IPMAT Preparation Guide</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700 bg-sky-100 px-3 py-1 rounded-full mb-4">
            <Target className="w-3 h-3" /> Integrated Programme in Management
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            IPMAT Preparation Guide 2026
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-3xl leading-relaxed">
            Everything you need to crack the Integrated Programme in Management Aptitude Test —
            eligibility rules, the latest IPMAT Indore & Rohtak pattern, section-wise syllabus,
            a month-by-month prep plan, and shortlisted coaching options for Class 11 & 12 aspirants
            targeting the 5-year IIM integrated programmes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {[
              { icon: Calendar, label: "IPMAT Indore: May 2026" },
              { icon: Calendar, label: "IPMAT Rohtak: May 2026" },
              { icon: Clock, label: "Duration: 90–120 min" },
              { icon: GraduationCap, label: "Class 12 pass required" },
            ].map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-700">
                <c.icon className="w-3.5 h-3.5 text-sky-600" />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 md:py-14 max-w-5xl grid md:grid-cols-[220px,1fr] gap-10">
        {/* TOC */}
        <aside className="hidden md:block sticky top-24 self-start">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">On this page</p>
          <ul className="space-y-2 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-600 hover:text-sky-700 hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Body */}
        <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-a:text-sky-700 prose-a:no-underline hover:prose-a:underline">
          <section id="what-is-ipmat">
            <h2>What is IPMAT?</h2>
            <p>
              The <strong>Integrated Programme in Management Aptitude Test (IPMAT)</strong> is the
              entrance gateway to the 5-year Integrated Programme in Management (IPM) offered by
              IIM Indore, IIM Rohtak, IIM Ranchi, IIM Jammu and IIM Bodh Gaya. Class 12 students who
              want to enter an IIM directly — without waiting to write CAT after graduation — sit
              for IPMAT every May.
            </p>
            <p>
              Two independent exams dominate the calendar: <strong>IPMAT Indore</strong> conducted
              by IIM Indore and <strong>IPMAT Rohtak</strong> (JIPMAT for Jammu/Bodh Gaya) conducted
              by IIM Rohtak. Candidates typically appear for both to maximise their chances.
            </p>
          </section>

          <section id="eligibility">
            <h2>Eligibility Criteria</h2>
            <ul>
              <li><strong>Academics:</strong> Passed Class 10 and 12 with a minimum of 60% (55% for SC/ST/PwD) from a recognised board.</li>
              <li><strong>Age limit:</strong> Candidates must not be older than 20 years as of 31 July of the admission year (relaxations apply for reserved categories).</li>
              <li><strong>Stream:</strong> Open to students from any stream — Science, Commerce or Humanities.</li>
              <li><strong>Appearing candidates:</strong> Class 12 appearing students are eligible; results must be produced at admission time.</li>
            </ul>
          </section>

          <section id="pattern">
            <h2>IPMAT Exam Pattern</h2>
            <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Section</th>
                    <th className="text-left px-4 py-3 font-semibold">IPMAT Indore</th>
                    <th className="text-left px-4 py-3 font-semibold">IPMAT Rohtak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-medium">Quantitative Aptitude (MCQ)</td><td className="px-4 py-3">30 Q · 40 min</td><td className="px-4 py-3" rowSpan={2}>60 Q · 40 min combined</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Quantitative Aptitude (SA)</td><td className="px-4 py-3">15 Q · 40 min</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Verbal Ability</td><td className="px-4 py-3">45 Q · 40 min</td><td className="px-4 py-3">40 Q · 40 min</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Logical Reasoning</td><td className="px-4 py-3">—</td><td className="px-4 py-3">20 Q · 40 min</td></tr>
                  <tr className="bg-sky-50/50"><td className="px-4 py-3 font-semibold">Total</td><td className="px-4 py-3 font-semibold">90 Q · 120 min</td><td className="px-4 py-3 font-semibold">120 Q · 120 min</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Marking: +4 for correct MCQs, −1 for wrong MCQs. Short-answer questions carry no negative marking on IPMAT Indore.</p>
          </section>

          <section id="syllabus">
            <h2>Section-wise Syllabus</h2>

            <h3>Quantitative Aptitude</h3>
            <p>Arithmetic (percentages, ratios, TSD, work), Algebra (linear/quadratic equations, inequalities, functions), Modern Maths (permutations, combinations, probability), Number System, Geometry &amp; Mensuration, and Data Interpretation. NCERT Class 9–12 mathematics is the foundation.</p>

            <h3>Verbal Ability</h3>
            <p>Reading Comprehension, para-jumbles, sentence completion, vocabulary in context, grammar (subject-verb agreement, tenses, modifiers), and error spotting. Consistent reading of long-form journalism (The Hindu, Aeon, The Atlantic) sharpens RC accuracy.</p>

            <h3>Logical Reasoning (Rohtak only)</h3>
            <p>Blood relations, syllogisms, seating arrangements, coding-decoding, series, direction sense, and data sufficiency.</p>
          </section>

          <section id="strategy">
            <h2>Month-by-Month Preparation Strategy</h2>
            <ol>
              <li><strong>Month 1–2 · Diagnose &amp; Build Base:</strong> Take a full-length diagnostic mock. Rebuild NCERT Class 9–10 maths and start a daily 30-minute vocabulary + RC habit.</li>
              <li><strong>Month 3–5 · Concept Depth:</strong> Cover advanced arithmetic, algebra and modern maths. Solve 15 RC passages per week and start LR sets for Rohtak.</li>
              <li><strong>Month 6–7 · Sectional Mocks:</strong> Move to timed sectional tests. Maintain an error log — every wrong question tagged by concept and reason (silly, conceptual, application).</li>
              <li><strong>Month 8–9 · Full Mocks &amp; PYQs:</strong> Take 2 full-length mocks per week plus every previous-year IPMAT paper from 2019 onwards. Analyse each mock for 2× the time you took to write it.</li>
              <li><strong>Final 4 weeks:</strong> Revise formula sheets, redo bookmarked hard questions, and simulate the exact exam-day slot to lock in stamina and pacing.</li>
            </ol>
            <div className="not-prose bg-sky-50 border border-sky-100 rounded-xl p-4 my-6">
              <p className="text-sm text-slate-700 flex gap-3">
                <TrendingUp className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <span><strong>Cut-off benchmark:</strong> For IIM Indore, general-category candidates typically need <strong>65–70+</strong> in Quant and <strong>70–75+</strong> in Verbal (out of the sectional maxima) to clear the shortlist for the AT-PI round.</span>
              </p>
            </div>
          </section>

          <section id="coaching">
            <h2>Choosing IPMAT Coaching</h2>
            <p>
              Because IPMAT is written by Class 11–12 students, quality of guidance matters more than
              raw content volume. Look for these signals when shortlisting an institute:
            </p>
            <ul>
              <li><CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" /> Verified selections into IIM Indore &amp; Rohtak in the last two cycles (not just CAT results).</li>
              <li><CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" /> Dedicated IPMAT batches — not CAT modules repackaged.</li>
              <li><CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" /> At least 25 full-length mocks with detailed analytics and a personal mentor.</li>
              <li><CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" /> Structured Written Ability Test (WAT) &amp; Personal Interview prep for the second stage.</li>
            </ul>
            <p>
              Compare shortlisted institutes on fees, batch size, and past selection ratios using our{" "}
              <Link to="/coaching">coaching directory</Link> and{" "}
              <Link to="/compare">side-by-side comparison tool</Link>.
            </p>
          </section>

          <section id="colleges">
            <h2>IIMs Offering the IPM Programme</h2>
            <div className="not-prose grid sm:grid-cols-2 gap-3 my-4">
              {[
                { name: "IIM Indore", note: "First IIM to launch IPM (2011). Flagship 5-year programme." },
                { name: "IIM Rohtak", note: "Second-largest IPM cohort; separate IPMAT entrance." },
                { name: "IIM Ranchi", note: "5-year IPM launched 2021; admits via IPMAT Indore score." },
                { name: "IIM Jammu", note: "Admits via JIPMAT conducted by NTA." },
                { name: "IIM Bodh Gaya", note: "Admits via JIPMAT conducted by NTA." },
              ].map((c) => (
                <div key={c.name} className="border border-slate-200 rounded-xl p-4 hover:border-sky-300 transition-colors">
                  <div className="flex items-center gap-2 mb-1"><School className="w-4 h-4 text-sky-600" /><span className="font-semibold text-slate-800">{c.name}</span></div>
                  <p className="text-xs text-slate-600">{c.note}</p>
                </div>
              ))}
            </div>
            <p>
              Explore fee structures, placement data, and cut-offs on the{" "}
              <Link to="/colleges">MBA Compass colleges directory</Link>, or dive into the{" "}
              <Link to="/exam/ipmat">IPMAT exam page</Link> for the latest notification.
            </p>
          </section>

          <section id="faq">
            <h2>Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="!mt-0">Is IPMAT tougher than CAT?</h3>
                <p>IPMAT tests Class 11–12 fundamentals rather than CAT's advanced reasoning, but the sub-2-minute-per-question pace makes speed the real differentiator. A well-prepared Class 12 student can clear IPMAT in one focused year of study.</p>
              </div>
              <div>
                <h3>Can Humanities students crack IPMAT?</h3>
                <p>Yes. The Quant syllabus is capped at Class 10 CBSE mathematics, so any student who rebuilds arithmetic and algebra fundamentals can compete on equal footing.</p>
              </div>
              <div>
                <h3>How many attempts are allowed?</h3>
                <p>There is no cap on attempts, but candidates must be under 20 years of age at the cut-off date, which effectively limits most aspirants to 1–2 attempts right after Class 12.</p>
              </div>
              <div>
                <h3>What happens after clearing the written test?</h3>
                <p>Shortlisted candidates are called for a Written Ability Test (WAT) and Personal Interview (PI). Final selection weights the written score, WAT, PI, and past academics.</p>
              </div>
            </div>
          </section>

          <div className="not-prose mt-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Ready to plan your IPMAT prep?</h2>
            <p className="text-sky-50 text-sm md:text-base mb-4">Get a personalised study plan, mock tests and coaching shortlist tailored to your target IIM.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/college-shortlister" className="inline-flex items-center gap-2 bg-white text-sky-700 font-semibold px-4 py-2.5 rounded-lg hover:bg-sky-50 transition-colors text-sm">
                <BookOpen className="w-4 h-4" /> Shortlist IIMs
              </Link>
              <Link to="/coaching" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-white/20 transition-colors text-sm">
                Browse IPMAT Coaching
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default IpmatPreparationGuide;
