import { createFileRoute } from "@tanstack/react-router";
import AdminMerittoLogs from "@/pages/admin/AdminMerittoLogs";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/meritto-logs")({
  component: () => <AdminMerittoLogs />,
  pendingComponent: PublicPageSkeleton,
});
