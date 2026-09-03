import { createFileRoute } from "@tanstack/react-router";
import AdminMockBuilder from "@/pages/admin/AdminMockBuilder";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mock-tests/$testId/builder")({
  component: () => <AdminMockBuilder />,
  pendingComponent: PublicPageSkeleton,
});
