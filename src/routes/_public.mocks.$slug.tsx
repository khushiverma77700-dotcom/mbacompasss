import { createFileRoute } from "@tanstack/react-router";
import MockTestIntroPage from "@/pages/mocks/MockTestIntroPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/$slug")({
  component: () => <MockTestIntroPage />,
  pendingComponent: PublicPageSkeleton,
});
