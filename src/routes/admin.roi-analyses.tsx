import { createFileRoute } from "@tanstack/react-router";
import AdminROIAnalyses from "@/pages/admin/AdminROIAnalyses";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/roi-analyses")({
  component: () => <AdminROIAnalyses />,
  pendingComponent: PublicPageSkeleton,
});
