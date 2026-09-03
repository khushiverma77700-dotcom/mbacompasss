import { createFileRoute } from "@tanstack/react-router";
import AdminCallbacks from "@/pages/admin/AdminCallbacks";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/callbacks")({
  component: () => <AdminCallbacks />,
  pendingComponent: PublicPageSkeleton,
});
