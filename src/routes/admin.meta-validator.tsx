import { createFileRoute } from "@tanstack/react-router";
import AdminMetaValidator from "@/pages/admin/AdminMetaValidator";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/meta-validator")({
  component: () => <AdminMetaValidator />,
  pendingComponent: PublicPageSkeleton,
});
