import { createFileRoute } from "@tanstack/react-router";
import AdminDatabaseBackup from "@/pages/admin/AdminDatabaseBackup";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/database-backup")({
  component: () => <AdminDatabaseBackup />,
  pendingComponent: PublicPageSkeleton,
});
