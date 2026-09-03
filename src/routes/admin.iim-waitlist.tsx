import { createFileRoute } from "@tanstack/react-router";
import AdminIIMWaitlist from "@/pages/admin/AdminIIMWaitlist";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/iim-waitlist")({
  component: () => <AdminIIMWaitlist />,
  pendingComponent: PublicPageSkeleton,
});
