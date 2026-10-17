import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockBundleDetailPage from "@/pages/courses/MockBundleDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/bundles/$slug")({
  head: ({ params }) => publicPageHead(`/bundles/${params.slug}`, `${params.slug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <MockBundleDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
