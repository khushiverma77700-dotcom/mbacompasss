import { createFileRoute } from "@tanstack/react-router";
import AdminPushNotifications from "@/pages/admin/AdminPushNotifications";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/push-notifications")({
  component: () => <AdminPushNotifications />,
  pendingComponent: PublicPageSkeleton,
});
