import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CollegeShortlisterPage from "@/pages/CollegeShortlisterPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/tools/college-shortlister")({
  head: () => publicPageHead('/tools/college-shortlister', 'MBA College Shortlister & Admission Fit | MBA Compass', 'Shortlist MBA colleges using your exam score, academic profile and preferences. Explore admission fit and compare business schools.'),
  component: () => <CollegeShortlisterPage />,
  pendingComponent: PublicPageSkeleton,
});
