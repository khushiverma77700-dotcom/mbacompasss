import { createFileRoute } from "@tanstack/react-router";
import AdminStudentNotificationsBroadcast from "@/pages/admin/AdminStudentNotificationsBroadcast";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/student-notifications")({
  component: () => <AdminStudentNotificationsBroadcast />,
  pendingComponent: PublicPageSkeleton,
});
