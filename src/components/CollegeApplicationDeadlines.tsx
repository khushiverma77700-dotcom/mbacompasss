import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, IndianRupee, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, formatDate, formatFee } from "@/lib/applicationTracker";

type DeadlineCollege = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  program: string | null;
  application_deadline: string | null;
  application_fee: number | null;
  average_package: number | null;
  highest_package: number | null;
  apply_url: string | null;
  homepage_order: number;
};

const formatPackage = (value: number | null) => {
  if (value === null) return "—";
  return `₹${(value / 100_000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} LPA`;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const DeadlineCard = ({ college }: { college: DeadlineCollege }) => {
  const days = daysUntil(college.application_deadline);
  const deadlineLabel = days === null
    ? "Date to be announced"
    : days === 0
      ? "Closes today"
      : days > 0
        ? `${days} days left`
        : "Applications closed";

  return (
    <article className="w-[310px] shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md sm:w-[350px]">
      <div className="h-1 bg-primary" />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
            {college.logo_url ? (
              <img src={college.logo_url} alt={`${college.name} logo`} loading="lazy" decoding="async" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-sm font-bold text-primary">{initials(college.name)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-heading text-lg font-bold leading-snug text-foreground">{college.name}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">{college.program ?? "MBA programme"}</p>
          </div>
          <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">{deadlineLabel}</span>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Application deadline</span>
          <span className="text-sm font-bold text-foreground">{formatDate(college.application_deadline)}</span>
        </div>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
          <div className="px-2">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Average</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">{formatPackage(college.average_package)}</dd>
          </div>
          <div className="px-2">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5" /> Highest</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">{formatPackage(college.highest_package)}</dd>
          </div>
          <div className="px-2">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> App fee</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">{formatFee(college.application_fee)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a href={`/mba-application/${college.slug}`}>View details</a>
          </Button>
          {college.apply_url && days !== null && days >= 0 && (
            <Button asChild className="flex-1">
              <a href={college.apply_url} target="_blank" rel="noopener noreferrer">Apply now <ArrowRight /></a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default function CollegeApplicationDeadlines() {
  const { data = [] } = useQuery({
    queryKey: ["homepage-college-application-deadlines"],
    queryFn: async (): Promise<DeadlineCollege[]> => {
      const { data: rows, error } = await supabase
        .from("application_trackers")
        .select("id, name, slug, logo_url, program, application_deadline, application_fee, average_package, highest_package, apply_url, homepage_order")
        .eq("is_homepage_featured", true)
        .eq("is_active", true)
        .eq("is_archived", false)
        .neq("category", "exam")
        .order("homepage_order", { ascending: true })
        .order("application_deadline", { ascending: true, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return (rows ?? []).filter((row) => row.name.trim() && row.slug.trim());
    },
    staleTime: 10 * 60 * 1000,
  });

  if (data.length === 0) return null;
  const loop = data.length > 2 ? [...data, ...data] : data;

  return (
    <section className="overflow-hidden border-y border-border bg-secondary/40 py-14" aria-labelledby="college-deadlines-heading">
      <div className="container mx-auto px-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase text-primary">Admissions now open</p>
            <h2 id="college-deadlines-heading" className="font-heading text-3xl font-bold text-foreground">Top College Application Deadlines</h2>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">Compare placement outcomes, application fees and closing dates before you apply.</p>
          </div>
          <Button asChild variant="outline">
            <a href="/mba-application">View all applications <ArrowRight /></a>
          </Button>
        </div>
      </div>

      <div className="relative mt-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-secondary/80 to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-secondary/80 to-transparent sm:w-24" />
        <div className={`flex w-max gap-4 px-4 ${data.length > 2 ? "animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none" : "mx-auto"}`}>
          {loop.map((college, index) => <DeadlineCard key={`${college.id}-${index}`} college={college} />)}
        </div>
      </div>
    </section>
  );
}