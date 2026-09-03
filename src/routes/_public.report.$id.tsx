import { createFileRoute } from "@tanstack/react-router";
import SharedReportPage from "@/pages/SharedReportPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/report/$id")({
  component: () => <SharedReportPage />,
  pendingComponent: PublicPageSkeleton,
});
