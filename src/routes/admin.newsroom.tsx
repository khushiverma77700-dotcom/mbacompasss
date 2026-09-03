import { createFileRoute } from "@tanstack/react-router";
import AdminNewsroom from "@/pages/admin/AdminNewsroom";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/newsroom")({
  component: () => <AdminNewsroom />,
  pendingComponent: PublicPageSkeleton,
});
