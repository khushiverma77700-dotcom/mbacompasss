import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/privacy-policy")({
  component: () => <PrivacyPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
