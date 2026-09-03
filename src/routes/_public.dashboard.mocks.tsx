import { createFileRoute } from "@tanstack/react-router";
import MyMocksPage from "@/pages/mocks/MyMocksPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/dashboard/mocks")({
  component: () => <MyMocksPage />,
  pendingComponent: PublicPageSkeleton,
});
