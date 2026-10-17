import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import InstituteCoursePage from "@/pages/InstituteCoursePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/institute/$slug/course/$courseSlug")({
  head: ({ params }) => publicPageHead(`/institute/${params.slug}/course/${params.courseSlug}`, `${params.courseSlug} | MBA Compass`, "Explore courseslug information, guides and resources on MBA Compass."),
  component: () => <InstituteCoursePage />,
  pendingComponent: PublicPageSkeleton,
});
