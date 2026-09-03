import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/terms")({
  component: () => <TermsPage />,
  pendingComponent: PublicPageSkeleton,
});
