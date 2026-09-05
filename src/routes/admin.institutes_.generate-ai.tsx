import { createFileRoute } from "@tanstack/react-router";
import AdminWriteInstitute from "@/pages/admin/AdminWriteInstitute";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/institutes_/generate-ai")({
  component: () => <AdminWriteInstitute />,
  pendingComponent: PublicPageSkeleton,
});
