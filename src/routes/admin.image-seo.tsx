import { createFileRoute } from "@tanstack/react-router";
import AdminImageSeo from "@/pages/admin/AdminImageSeo";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/image-seo")({
  component: () => <AdminImageSeo />,
  pendingComponent: PublicPageSkeleton,
});
