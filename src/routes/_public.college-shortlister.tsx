import { createFileRoute } from "@tanstack/react-router";
import CollegeShortlisterPage from "@/pages/CollegeShortlisterPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/college-shortlister")({
  component: () => <CollegeShortlisterPage />,
  pendingComponent: PublicPageSkeleton,
});
