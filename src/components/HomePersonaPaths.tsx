import { Link } from "@/lib/router-compat";
import { Rocket, Briefcase, RefreshCw, Globe, ArrowRight } from "lucide-react";

const PATHS = [
  {
    icon: Rocket,
    tag: "Final-year student",
    title: "First-attempt aspirant",
    body: "You have a full year. Build fundamentals, lock a mock schedule and target a 99+ percentile.",
    actions: [
      { label: "Find coaching", to: "/coaching" },
      { label: "Free tools", to: "/tools" },
    ],
  },
  {
    icon: Briefcase,
    tag: "Working professional",
    title: "2–5 years experience",
    body: "Weekend-friendly prep, work-ex weighted shortlists and executive MBA options mapped to your profile.",
    actions: [
      { label: "Profile analyser", to: "/tools/profile-analyzer" },
      { label: "Exam calendar", to: "/exams" },
    ],
  },
  {
    icon: RefreshCw,
    tag: "Repeater",
    title: "Second attempt",
    body: "Diagnose last year's percentile leak, fix accuracy over speed and convert calls you missed.",
    actions: [
      { label: "Take mocks", to: "/student" },
      { label: "Call predictor", to: "/tools/predictor" },
    ],
  },
  {
    icon: Globe,
    tag: "Global route",
    title: "GMAT / abroad",
    body: "ISB, GMAT-accepting Indian schools and international programmes — compare cost, ROI and visa pathways.",
    actions: [
      { label: "Explore colleges", to: "/colleges" },
      { label: "Read guides", to: "/blog" },
    ],
  },
];

/**
 * Persona router — sends each visitor type straight to the right tool instead of
 * making them scan the whole homepage.
 */
const HomePersonaPaths = () => (
  <section className="py-16 md:py-24 bg-white" id="home-paths">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          Start Where You Are
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          Pick the path that <span className="font-editorial italic text-primary">sounds like you</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Four aspirant profiles, four different plans. Choose yours and we will point you to the exact next step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PATHS.map(({ icon: Icon, tag, title, body, actions }) => (
          <article
            key={title}
            className="group relative flex flex-col rounded-2xl border border-primary/10 bg-gradient-to-br from-sky-50/60 via-white to-white p-5 md:p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-sky-200/40"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 shadow-md shadow-sky-200/60">
              <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{tag}</p>
            <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{body}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    i === 0
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-primary/20 text-primary hover:bg-primary/5"
                  }`}
                >
                  {a.label} {i === 0 && <ArrowRight className="h-3.5 w-3.5" />}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomePersonaPaths;
