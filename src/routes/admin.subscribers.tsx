import { createFileRoute } from "@tanstack/react-router";
import AdminSubscribers from "@/pages/admin/AdminSubscribers";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/subscribers")({
  component: () => <AdminSubscribers />,
  pendingComponent: PublicPageSkeleton,
});
