import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FactCheckPolicyPage from "@/pages/FactCheckPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/fact-check-policy")({
  head: () => publicPageHead("/fact-check-policy", "Fact Check Policy | MBA Compass", "Explore fact check policy information, guides and resources on MBA Compass."),
  component: () => <FactCheckPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
