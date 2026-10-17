import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, BarChart3, GraduationCap, ListChecks, Sparkles, Target, TrendingUp,
} from "lucide-react";

export interface TocItem {
  id: string;
  label: string;
}

/** Highlights the section currently in view. */
const useActiveSection = (ids: string[]) => {
  const [active, setActive] = useState<string>(ids[0] || "");

  useEffect(() => {
    if (!ids.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: [0, 0.25, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids.join("|")]);

  return active;
};

const PLANNER_LINKS = [
  {
    to: "/tools/college-shortlister",
    label: "College shortlister",
    description: "Map your score to safe, target & reach colleges",
    icon: ListChecks,
  },
  {
    to: "/tools/profile-analyzer",
    label: "AI profile analyzer",
    description: "Get an instant profile strength report",
    icon: Sparkles,
  },
  {
    to: "/mocks",
    label: "Full-length mock tests",
    description: "Exam-pattern mocks with deep analytics",
    icon: Target,
  },
  {
    to: "/mba-roi-calculator",
    label: "MBA ROI calculator",
    description: "Compare fees against expected salary",
    icon: TrendingUp,
  },
  {
    to: "/colleges",
    label: "Browse MBA colleges",
    description: "Fees, cutoffs, placements & rankings",
    icon: GraduationCap,
  },
];

export const ExamTocCard = ({ items }: { items: TocItem[] }) => {
  const active = useActiveSection(items.map((i) => i.id));
  if (!items.length) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
          </p>
        </div>
        <nav aria-label="On this page" className="max-h-[60vh] overflow-y-auto p-2">
          <ol className="space-y-0.5">
            {items.map((item, i) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`w-4 shrink-0 text-right text-xs tabular-nums ${
                        isActive ? "text-primary" : "text-muted-foreground/60"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 leading-snug">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </CardContent>
    </Card>
  );
};

export const ExamPlannerCard = () => (
  <Card className="overflow-hidden border-primary/20">
    <CardContent className="p-0">
      <div className="border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Plan your admission
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Free tools to turn your score into a shortlist
        </p>
      </div>
      <div className="divide-y divide-border">
        {PLANNER_LINKS.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.04]"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                {label}
                <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </CardContent>
  </Card>
);
