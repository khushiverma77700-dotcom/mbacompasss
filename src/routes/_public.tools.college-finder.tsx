import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CollegeFinderPage from "@/pages/CollegeFinderPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/tools/college-finder")({
  head: () => publicPageHead("/tools/college-finder", "MBA Coaching Finder | MBA Compass", "Explore mba coaching finder information and personalised MBA preparation tools on MBA Compass."),
  component: () => <CollegeFinderPage />,
  pendingComponent: PublicPageSkeleton,
});
