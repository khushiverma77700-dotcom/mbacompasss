import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockTestIntroPage from "@/pages/mocks/MockTestIntroPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/$slug")({
  head: ({ params }) => publicPageHead(`/mocks/${params.slug}`, `${params.slug} | MBA Compass`, "Explore slug information, guides and resources on MBA Compass."),
  component: () => <MockTestIntroPage />,
  pendingComponent: PublicPageSkeleton,
});
