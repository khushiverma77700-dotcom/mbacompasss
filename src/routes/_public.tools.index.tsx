import { createFileRoute, Link } from "@tanstack/react-router";
import { publicPageHead } from "@/lib/publicPageHead";
import { ArrowUpRight } from "lucide-react";
const tools = [
  { path: "/tools/cat-score-calculator", name: "CAT Score Calculator" },
  { path: "/tools/roi-calculator", name: "MBA ROI Calculator" },
  { path: "/tools/profile-analyzer", name: "Profile Analyser" },
  { path: "/tools/college-finder", name: "Coaching Finder" },
  { path: "/tools/college-shortlister", name: "College Shortlister" },
  { path: "/tools/iim-waitlist-movement", name: "IIM Waitlist Movement" },
] as const;
export const Route = createFileRoute("/_public/tools/")({
  head: () => publicPageHead("/tools", "MBA Tools & Calculators | MBA Compass", "Explore CAT scoring, MBA ROI, profile analysis, coaching and college shortlisting tools on MBA Compass."),
  component: () => <section className="container mx-auto px-4 py-10"><h1 className="text-4xl font-heading font-bold mb-8">MBA Tools &amp; Calculators</h1><ul className="grid gap-x-10 md:grid-cols-2">{tools.map((tool) => <li key={tool.path} className="border-b border-border py-5"><Link to={tool.path} className="flex items-center justify-between gap-4 text-lg font-semibold text-foreground hover:text-primary">{tool.name}<ArrowUpRight className="size-5 shrink-0" /></Link></li>)}</ul></section>,
});