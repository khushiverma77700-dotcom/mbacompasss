import { createFileRoute } from "@tanstack/react-router";
import MBACompassCourseDetailPage from "@/pages/MBACompassCourseDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/courses/$slug")({
  component: () => <MBACompassCourseDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
