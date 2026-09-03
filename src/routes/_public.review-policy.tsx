import { createFileRoute } from "@tanstack/react-router";
import ReviewPolicyPage from "@/pages/ReviewPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/review-policy")({
  component: () => <ReviewPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
