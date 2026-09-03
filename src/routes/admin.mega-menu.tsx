import { createFileRoute } from "@tanstack/react-router";
import AdminMegaMenu from "@/pages/admin/AdminMegaMenu";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mega-menu")({
  component: () => <AdminMegaMenu />,
  pendingComponent: PublicPageSkeleton,
});
