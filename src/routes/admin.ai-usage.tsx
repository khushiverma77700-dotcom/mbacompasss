import { createFileRoute } from "@tanstack/react-router";
import AdminAIUsage from "@/pages/admin/AdminAIUsage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/ai-usage")({
  component: () => <AdminAIUsage />,
  pendingComponent: PublicPageSkeleton,
});
