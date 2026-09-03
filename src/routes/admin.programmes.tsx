import { createFileRoute } from "@tanstack/react-router";
import AdminProgrammes from "@/pages/admin/AdminProgrammes";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/programmes")({
  component: () => <AdminProgrammes />,
  pendingComponent: PublicPageSkeleton,
});
