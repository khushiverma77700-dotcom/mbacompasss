import { createFileRoute } from "@tanstack/react-router";
import AdminFreebieDownloads from "@/pages/admin/AdminFreebieDownloads";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/freebies_/downloads")({
  component: () => <AdminFreebieDownloads />,
  pendingComponent: PublicPageSkeleton,
});
