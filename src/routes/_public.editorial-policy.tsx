import { createFileRoute } from "@tanstack/react-router";
import EditorialPolicyPage from "@/pages/EditorialPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/editorial-policy")({
  component: () => <EditorialPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
