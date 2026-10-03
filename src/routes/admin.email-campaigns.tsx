import { createFileRoute } from "@tanstack/react-router";
import AdminEmailCampaigns from "@/pages/admin/AdminEmailCampaigns";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/email-campaigns")({
  component: () => <AdminEmailCampaigns />,
  pendingComponent: PublicPageSkeleton,
});
