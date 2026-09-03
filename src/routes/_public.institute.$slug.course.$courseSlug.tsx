import { createFileRoute } from "@tanstack/react-router";
import InstituteCoursePage from "@/pages/InstituteCoursePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/institute/$slug/course/$courseSlug")({
  component: () => <InstituteCoursePage />,
  pendingComponent: PublicPageSkeleton,
});
