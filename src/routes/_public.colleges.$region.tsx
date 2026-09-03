import { createFileRoute } from "@tanstack/react-router";
import CollegeFilterPage from "@/pages/CollegeFilterPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/$region")({
  component: () => <CollegeFilterPage />,
  pendingComponent: PublicPageSkeleton,
});
