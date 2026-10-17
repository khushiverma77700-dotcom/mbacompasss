import { Link } from "@/lib/router-compat";
import { ArrowUpRight } from "lucide-react";

export interface ClusterLink {
  label: string;
  to: string;
  description?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  links: ClusterLink[];
  className?: string;
}

/**
 * Renders a "Explore more" topic-cluster block that boosts internal linking
 * depth between hub pages, blog content and tools. Use it at the end of
 * articles, listing pages and hub pages to expose the surrounding cluster.
 */
const TopicClusterLinks = ({
  title = "Explore the MBA Compass hub",
  subtitle = "Hand-picked guides, tools and directories to keep your MBA prep on track.",
  links,
  className = "",
}: Props) => {
  if (!links?.length) return null;
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border bg-card/60 p-6 sm:p-8 ${className}`}
    >
      <header className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="group flex items-start gap-2 rounded-xl border bg-background/60 p-3 hover:border-primary/40 hover:bg-primary/5 transition"
            >
              <ArrowUpRight className="h-4 w-4 mt-0.5 text-primary shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              <div>
                <div className="text-sm font-semibold text-foreground">{l.label}</div>
                {l.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {l.description}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const DEFAULT_MBA_CLUSTER: ClusterLink[] = [
  { label: "Top MBA Colleges in India", to: "/colleges", description: "Search 1,500+ B-schools by fees, location, exam and ROI." },
  { label: "AI College Finder", to: "/tools/college-finder", description: "Get a personalised B-school shortlist from your CAT score." },
  { label: "Profile Analyzer", to: "/tools/profile-analyzer", description: "Free AI evaluation of your MBA candidacy in 60 seconds." },
  { label: "MBA ROI Calculator", to: "/tools/roi-calculator", description: "Project salary, payback and 5-year returns by B-school." },
  { label: "CAT Score Calculator", to: "/tools/cat-score-calculator", description: "Convert raw attempts to expected CAT percentile." },
  { label: "MBA Compass Courses", to: "/courses", description: "Mocks, prep bundles and structured CAT/XAT courses." },
];

export default TopicClusterLinks;
