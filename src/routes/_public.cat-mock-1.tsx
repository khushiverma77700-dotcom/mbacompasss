import { createFileRoute } from "@tanstack/react-router";
import CatMock1Page from "@/pages/CatMock1Page";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/cat-mock-1")({
  component: () => <CatMock1Page />,
  pendingComponent: PublicPageSkeleton,
});
