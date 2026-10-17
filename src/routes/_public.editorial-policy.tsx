import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import EditorialPolicyPage from "@/pages/EditorialPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/editorial-policy")({
  head: () => publicPageHead("/editorial-policy", "Editorial Policy | MBA Compass", "Explore editorial policy information, guides and resources on MBA Compass."),
  component: () => <EditorialPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
