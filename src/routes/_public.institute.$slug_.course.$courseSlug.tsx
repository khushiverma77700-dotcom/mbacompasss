import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import InstituteCoursePage from "@/pages/InstituteCoursePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/institute/$slug_/course/$courseSlug")({
  head: ({ params }) => publicPageHead(`/institute/${params.slug}/course/${params.courseSlug}`, `${params.courseSlug.replace(/-/g, " ")} | MBA Compass`, `Explore ${params.courseSlug.replace(/-/g, " ")} at ${params.slug.replace(/-/g, " ")}: course fees, duration, eligibility and preparation options.`),
  component: () => <InstituteCoursePage />,
  pendingComponent: PublicPageSkeleton,
});
