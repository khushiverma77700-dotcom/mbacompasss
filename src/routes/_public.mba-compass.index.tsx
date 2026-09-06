import { createFileRoute } from "@tanstack/react-router";
import MBACompassCoursesPage from "@/pages/MBACompassCoursesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/")({
  component: () => <MBACompassCoursesPage />,
  pendingComponent: PublicPageSkeleton,
});
