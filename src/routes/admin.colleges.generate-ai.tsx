import { createFileRoute } from "@tanstack/react-router";
import AdminWriteCollege from "@/pages/admin/AdminWriteCollege";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/colleges/generate-ai")({
  component: () => <AdminWriteCollege />,
  pendingComponent: PublicPageSkeleton,
});
