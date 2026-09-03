import { createFileRoute } from "@tanstack/react-router";
import AdminVocabulary from "@/pages/admin/AdminVocabulary";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/vocabulary")({
  component: () => <AdminVocabulary />,
  pendingComponent: PublicPageSkeleton,
});
