import { createFileRoute } from "@tanstack/react-router";
import AdminMBANewsroomBar from "@/pages/admin/AdminMBANewsroomBar";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mba-newsroom-bar")({
  component: () => <AdminMBANewsroomBar />,
  pendingComponent: PublicPageSkeleton,
});
