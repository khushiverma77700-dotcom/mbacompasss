import { createFileRoute } from "@tanstack/react-router";
import MocksListPage from "@/pages/mocks/MocksListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks")({
  component: () => <MocksListPage />,
  pendingComponent: PublicPageSkeleton,
});
