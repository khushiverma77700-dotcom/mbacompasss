import { createFileRoute } from "@tanstack/react-router";
import AdminBanners from "@/pages/admin/AdminBanners";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/banners")({
  component: () => <AdminBanners />,
  pendingComponent: PublicPageSkeleton,
});
