import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/pages/DashboardPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/dashboard")({
  component: () => <DashboardPage />,
  pendingComponent: PublicPageSkeleton,
});
