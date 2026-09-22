import { createFileRoute } from "@tanstack/react-router";
import AdminWhatsAppAutomation from "@/pages/admin/AdminWhatsAppAutomation";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/whatsapp-automation")({
  component: () => <AdminWhatsAppAutomation />,
  pendingComponent: PublicPageSkeleton,
});
