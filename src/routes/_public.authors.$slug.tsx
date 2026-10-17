import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import AuthorDetailPage from "@/pages/AuthorDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/authors/$slug")({
  head: ({ params }) => publicPageHead(`/authors/${params.slug}`, `${params.slug} | MBA Compass`, "Explore slug information, guides and resources on MBA Compass."),
  component: () => <AuthorDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
