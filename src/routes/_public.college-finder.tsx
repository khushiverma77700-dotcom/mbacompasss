import { createFileRoute } from "@tanstack/react-router";
import CollegeFinderPage from "@/pages/CollegeFinderPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/college-finder")({
  component: () => <CollegeFinderPage />,
  pendingComponent: PublicPageSkeleton,
});
