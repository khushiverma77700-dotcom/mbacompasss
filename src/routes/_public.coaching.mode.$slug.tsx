import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CoachingCategoryRedirect from "@/pages/CoachingCategoryRedirect";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/coaching/mode/$slug")({
  head: ({ params }) => publicPageHead(`/coaching/mode/${params.slug}`, `${params.slug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <CoachingCategoryRedirect kind="mode" />,
  pendingComponent: PublicPageSkeleton,
});
