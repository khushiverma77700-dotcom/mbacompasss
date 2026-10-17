import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import AuthorsPage from "@/pages/AuthorsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/authors")({
  head: () => publicPageHead("/authors", "Authors | MBA Compass", "Explore authors information, guides and resources on MBA Compass."),
  component: () => <AuthorsPage />,
  pendingComponent: PublicPageSkeleton,
});
