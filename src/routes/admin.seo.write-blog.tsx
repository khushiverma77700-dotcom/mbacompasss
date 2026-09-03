import { createFileRoute } from "@tanstack/react-router";
import AdminWriteBlog from "@/pages/admin/AdminWriteBlog";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/seo/write-blog")({
  component: () => <AdminWriteBlog />,
  pendingComponent: PublicPageSkeleton,
});
