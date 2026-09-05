import { createFileRoute } from "@tanstack/react-router";
import AdminCollegeApplications from "@/pages/admin/AdminCollegeApplications";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

type Search = { tab?: string; action?: string };

export const Route = createFileRoute("/admin/college-applications")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
    action: typeof search["action"] === "string" ? search["action"] : undefined,
  }),
  component: RouteComponent,
  pendingComponent: PublicPageSkeleton,
});

function RouteComponent() {
  const { tab, action } = Route.useSearch();
  return <AdminCollegeApplications initialTab={tab} initialAction={action} />;
}
