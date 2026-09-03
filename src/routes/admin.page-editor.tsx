import { createFileRoute } from "@tanstack/react-router";
import AdminPageEditor from "@/pages/admin/AdminPageEditor";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/page-editor")({
  component: () => <AdminPageEditor />,
  pendingComponent: PublicPageSkeleton,
});
