import { createFileRoute } from "@tanstack/react-router";
import AdminExplanationCleaner from "@/pages/admin/AdminExplanationCleaner";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/explanation-cleaner")({
  component: () => <AdminExplanationCleaner />,
  pendingComponent: PublicPageSkeleton,
});
