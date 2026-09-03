import { createFileRoute } from "@tanstack/react-router";
import FactCheckPolicyPage from "@/pages/FactCheckPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/fact-check-policy")({
  component: () => <FactCheckPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
