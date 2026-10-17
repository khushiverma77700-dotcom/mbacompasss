import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/privacy-policy")({
  head: () => publicPageHead("/privacy-policy", "Privacy Policy | MBA Compass", "Explore privacy policy information, guides and resources on MBA Compass."),
  component: () => <PrivacyPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
