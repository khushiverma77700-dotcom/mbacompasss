import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ReviewPolicyPage from "@/pages/ReviewPolicyPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/review-policy")({
  head: () => publicPageHead("/review-policy", "Review Policy | MBA Compass", "Explore review policy information, guides and resources on MBA Compass."),
  component: () => <ReviewPolicyPage />,
  pendingComponent: PublicPageSkeleton,
});
