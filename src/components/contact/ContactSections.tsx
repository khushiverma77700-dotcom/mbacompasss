import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, ArrowRight, Sparkles, Send, Search, Building2, GraduationCap,
  TrendingUp, Briefcase, MessageCircle, UserCheck, FileText, Scale,
  CalendarClock, Target, Compass, ListChecks, BarChart3,
} from "lucide-react";
import {
  helpTopics, freeList, studentQuestions, whoCanReachOut, guidanceFaqs,
  mentorshipJourney, catPlannerFlow, collegeFactors,
} from "./guidanceData";

const sectionClass = "py-14 md:py-20 bg-background";
const containerClass = "container mx-auto px-4";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const MotionDiv = ({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, inView } = useInView<HTMLDivElement>("80px");
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={reduced ? "visible" : inView ? "visible" : "hidden"}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SectionHeading = ({
  eyebrow, title, subtitle, align = "center",
}: { eyebrow?: string; title: string; subtitle?: string; align?: "left" | "center" }) => (
  <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""} mb-10 md:mb-12`}>
    {eyebrow && (
      <Badge variant="secondary" className="mb-3 text-xs font-semibold tracking-wide">
        {eyebrow}
      </Badge>
    )}
    <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
      {title}
    </h2>
    {subtitle && <p className="text-muted-foreground mt-3 leading-relaxed">{subtitle}</p>}
  </div>
);

const scrollToForm = () => {
  const el = document.getElementById("guidance-form");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const CtaButton = ({
  children, variant = "default", className = "", onClick,
}: { children: React.ReactNode; variant?: "default" | "outline" | "secondary"; className?: string; onClick?: () => void }) => (
  <Button
    variant={variant}
    className={`min-h-11 px-6 text-sm font-semibold ${className}`}
    onClick={onClick || scrollToForm}
  >
    {children} <ArrowRight className="w-4 h-4 ml-1.5" />
  </Button>
);

export const HelpCategoriesSection = ({ onSelect }: { onSelect: (topic: string) => void }) => (
  <section className={sectionClass}>
    <div className={containerClass}>
      <SectionHeading
        eyebrow="Free MBA Counselling"
        title="What Can We Help You With?"
        subtitle="Pick the area where you need free MBA counselling or guidance. Every service below is free for students for the current one-month initiative."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {helpTopics.map((topic, i) => {
          const Icon = topic.icon;
          return (
            <MotionDiv key={topic.id} delay={i * 0.04}>
              <div className="group h-full bg-card rounded-2xl border border-border p-5 card-shadow hover:shadow-lg transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{topic.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{topic.description}</p>
                <button
                  type="button"
                  onClick={() => onSelect(topic.id)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {topic.cta} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </MotionDiv>
          );
        })}
      </div>
      <div className="text-center mt-10">
        <CtaButton>Talk to an MBA Guidance Expert</CtaButton>
      </div>
    </div>
  </section>
);

export const FreeHighlightSection = () => (
  <section className="py-14 md:py-20 bg-primary/[0.03]">
    <div className={containerClass}>
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <MotionDiv>
          <Badge variant="secondary" className="mb-3 text-xs font-semibold tracking-wide">100% Free for students</Badge>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Yes, All of This Is FREE.
          </h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            We believe students should have access to the right guidance before making an important MBA decision.
            For the next one month, MBA Compass is offering:
          </p>
        </MotionDiv>
        <MotionDiv delay={0.1}>
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 card-shadow">
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {freeList.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">100% FREE FOR STUDENTS.</p>
                <p className="text-sm text-muted-foreground">No consultation fee. No hidden charges. No obligation.</p>
              </div>
              <CtaButton className="shrink-0">Get Free Guidance</CtaButton>
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  </section>
);

export const ReviewSpotlightSection = () => (
  <section className={sectionClass}>
    <div className={containerClass}>
      <SectionHeading
        eyebrow="Profile & Resume"
        title="Free MBA Profile Review & Free Resume Review"
        subtitle="Two of the most important parts of your MBA application, reviewed by our team at no cost — useful for CAT profile review and MBA applications alike."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <MotionDiv>
          <div className="h-full bg-card rounded-2xl border border-border p-6 md:p-8 card-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-3">Free Profile Review</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Profile strengths", "Profile gaps", "Academic positioning", "Work experience positioning", "Extracurriculars", "Overall MBA profile"].map((x) => (
                <li key={x} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> {x}</li>
              ))}
            </ul>
          </div>
        </MotionDiv>
        <MotionDiv delay={0.1}>
          <div className="h-full bg-card rounded-2xl border border-border p-6 md:p-8 card-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-3">Free Resume Review</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Resume structure", "Content quality", "Achievement positioning", "MBA relevance", "Areas for improvement", "Common resume mistakes"].map((x) => (
                <li key={x} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> {x}</li>
              ))}
            </ul>
          </div>
        </MotionDiv>
      </div>
      <div className="text-center mt-10">
        <CtaButton>Get My Free Review</CtaButton>
      </div>
    </div>
  </section>
);

export const CollegeGuidanceSection = () => (
  <section className="py-14 md:py-20 bg-muted/30">
    <div className={containerClass}>
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <MotionDiv>
          <Badge variant="secondary" className="mb-3 text-xs font-semibold tracking-wide">Unbiased Guidance</Badge>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Don't Choose an MBA College Just Because It Looks Good on Paper.
          </h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Get a student-first, information-focused perspective on B-Schools. We help you evaluate colleges using practical factors that matter for your career.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {collegeFactors.map((f) => (
              <Badge key={f} variant="outline" className="px-3 py-1.5 text-xs font-medium">{f}</Badge>
            ))}
          </div>
          <div className="mt-6">
            <CtaButton>Get Free College Guidance</CtaButton>
          </div>
        </MotionDiv>
        <MotionDiv delay={0.1}>
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 card-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">What we cover</h3>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["Compare fees vs placements and ROI", "Understand recruiters, roles and career outcomes", "Check specialisation strength and location fit", "Read placement reports with context, not just numbers", "Profile-fit and admission-chance guidance"].map((x) => (
                <li key={x} className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
        </MotionDiv>
      </div>
    </div>
  </section>
);

export const CatPlannerSection = () => (
  <section className={sectionClass}>
    <div className={containerClass}>
      <SectionHeading
        eyebrow="CAT Preparation"
        title="Need a CAT Preparation Plan?"
        subtitle="Tell us about your preparation level and goals. We'll help you structure your CAT journey around a clear, practical flow."
      />
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {catPlannerFlow.map((step, i) => (
          <div key={step} className="flex items-center gap-3 md:gap-4">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-lg">
                {i + 1}
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-2">{step}</span>
            </div>
            {i < catPlannerFlow.length - 1 && (
              <ArrowRight className="hidden md:block w-5 h-5 text-muted-foreground/40" />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
        This is personalised guidance, not a guaranteed percentile promise. We help you build a plan that fits your schedule, strengths and target exam.
      </p>
      <div className="text-center mt-8">
        <CtaButton>Get My Free CAT Planner</CtaButton>
      </div>
    </div>
  </section>
);

export const MentorshipJourneySection = () => (
  <section className="py-14 md:py-20 bg-primary/[0.03]">
    <div className={containerClass}>
      <SectionHeading
        eyebrow="Mentorship"
        title="Free MBA Mentorship"
        subtitle="From CAT preparation to college selection and admissions, get guidance at every stage of your MBA journey."
      />
      <div className="relative max-w-4xl mx-auto">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2 hidden sm:block" />
        <div className="space-y-6">
          {mentorshipJourney.map((step, i) => (
            <MotionDiv key={step} delay={i * 0.06}>
              <div className={`flex items-center gap-4 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className="hidden md:block flex-1 text-right" />
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold z-10 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="bg-card rounded-xl border border-border px-5 py-3 card-shadow inline-block">
                    <span className="font-medium text-foreground">{step}</span>
                  </div>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
      <div className="text-center mt-10">
        <CtaButton>Talk To Us For Free</CtaButton>
      </div>
    </div>
  </section>
);

export const QuestionsSection = () => (
  <section className={sectionClass}>
    <div className={containerClass}>
      <SectionHeading
        eyebrow="One Place"
        title="One Place. Multiple MBA Questions."
        subtitle="Whatever your question, ask us. We are open to helping students with their MBA-related queries."
      />
      <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
        {studentQuestions.map((q) => (
          <div
            key={q}
            className="bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground card-shadow hover:border-primary/30 transition-colors"
          >
            “{q}”
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
        <CtaButton>Get Free MBA Guidance</CtaButton>
      </div>
    </div>
  </section>
);

export const WhoAndHowSection = () => (
  <section className="py-14 md:py-20 bg-muted/30">
    <div className={containerClass}>
      <div className="grid lg:grid-cols-2 gap-10 md:gap-16">
        <MotionDiv>
          <Badge variant="secondary" className="mb-3 text-xs font-semibold tracking-wide">Who is this for?</Badge>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Who Can Reach Out?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {whoCanReachOut.map((who) => (
              <div key={who} className="flex items-center gap-2 bg-card rounded-xl border border-border px-4 py-3 card-shadow">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{who}</span>
              </div>
            ))}
          </div>
        </MotionDiv>
        <MotionDiv delay={0.1}>
          <Badge variant="secondary" className="mb-3 text-xs font-semibold tracking-wide">How it works</Badge>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "Submit Your Query", desc: "Fill in the consultation form and tell us what you need help with." },
              { step: "02", title: "We Understand Your Profile", desc: "Our team reviews your requirements and understands your situation." },
              { step: "03", title: "Get Your Guidance", desc: "We help you understand your available options and next steps." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 bg-card rounded-2xl border border-border p-5 card-shadow">
                <span className="text-2xl font-heading font-bold text-primary">{s.step}</span>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </MotionDiv>
      </div>
    </div>
  </section>
);

export const TrustSection = () => (
  <section className={sectionClass}>
    <div className={containerClass}>
      <div className="max-w-4xl mx-auto text-center">
        <MotionDiv>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Student-First. Transparent. Information-Focused.
          </h2>
          <p className="text-muted-foreground mt-3 leading-relaxed max-w-2xl mx-auto">
            Students should have access to the right information before making important MBA decisions. We focus on transparent guidance, college comparison, placement context, ROI considerations and career-oriented decision making.
          </p>
        </MotionDiv>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {[
            { icon: Search, title: "Transparent information" },
            { icon: UserCheck, title: "Student-first guidance" },
            { icon: Scale, title: "College comparison" },
            { icon: TrendingUp, title: "Career-oriented decisions" },
          ].map(({ icon: Icon, title }, i) => (
            <MotionDiv key={title} delay={i * 0.06}>
              <div className="bg-card rounded-xl border border-border p-5 card-shadow h-full">
                <Icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">{title}</p>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const GuidanceFAQ = () => (
  <section className="py-14 md:py-20 bg-muted/30">
    <div className={containerClass}>
      <SectionHeading title="Frequently Asked Questions" />
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="space-y-3">
          {guidanceFaqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary transition-colors text-sm md:text-base py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export const FinalCTASection = () => (
  <section className="py-16 md:py-24 bg-primary text-primary-foreground">
    <div className={containerClass}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold">
          Your MBA Questions Deserve Better Answers.
        </h2>
        <p className="mt-4 text-primary-foreground/90 leading-relaxed">
          Whether you need a profile review, resume review, CAT strategy, CAT planner, college guidance, admission mentorship, placement guidance or simply someone to help you understand your options — reach out to us.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0">
            100% FREE FOR STUDENTS
          </Badge>
          <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0">
            Available for the next one month
          </Badge>
        </div>
        <div className="mt-8">
          <Button
            size="lg"
            variant="secondary"
            className="min-h-12 px-8 text-base font-semibold"
            onClick={scrollToForm}
          >
            Get My Free MBA Guidance <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  </section>
);
