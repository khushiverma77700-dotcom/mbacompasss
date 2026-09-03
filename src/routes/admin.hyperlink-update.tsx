import { createFileRoute } from "@tanstack/react-router";
import AdminHyperlinkUpdate from "@/pages/admin/AdminHyperlinkUpdate";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/hyperlink-update")({
  component: () => <AdminHyperlinkUpdate />,
  pendingComponent: PublicPageSkeleton,
});
