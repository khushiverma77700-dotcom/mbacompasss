import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CatMock1Page from "@/pages/CatMock1Page";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/cat-mock-1")({
  head: () => publicPageHead("/cat-mock-1", "Cat Mock 1 | MBA Compass", "Explore cat mock 1 information, guides and resources on MBA Compass."),
  component: () => <CatMock1Page />,
  pendingComponent: PublicPageSkeleton,
});
