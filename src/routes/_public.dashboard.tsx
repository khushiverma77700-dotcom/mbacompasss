import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/pages/DashboardPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/dashboard")({
  head: () => publicPageHead("/dashboard", "Dashboard | MBA Compass", "Explore dashboard information, guides and resources on MBA Compass."),
  component: () => <DashboardPage />,
  pendingComponent: PublicPageSkeleton,
});
