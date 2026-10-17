import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CategoryPage from "@/pages/CategoryPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/category/$slug")({
  head: ({ params }) => publicPageHead(`/category/${params.slug}`, `${params.slug} | MBA Compass`, "Explore slug information, guides and resources on MBA Compass."),
  component: () => <CategoryPage />,
  pendingComponent: PublicPageSkeleton,
});
