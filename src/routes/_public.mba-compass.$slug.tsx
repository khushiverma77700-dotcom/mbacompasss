import { createFileRoute } from "@tanstack/react-router";
import MBACompassCourseDetailPage from "@/pages/MBACompassCourseDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/$slug")({
  component: () => <MBACompassCourseDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
