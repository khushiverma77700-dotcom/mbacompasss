import { createFileRoute } from "@tanstack/react-router";
import AdminContentStudio from "@/pages/admin/AdminContentStudio";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/content-studio")({
  component: () => <AdminContentStudio />,
  pendingComponent: PublicPageSkeleton,
});
