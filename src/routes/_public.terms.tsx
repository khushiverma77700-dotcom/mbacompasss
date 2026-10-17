import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/terms")({
  head: () => publicPageHead("/terms", "Terms | MBA Compass", "Explore terms information, guides and resources on MBA Compass."),
  component: () => <TermsPage />,
  pendingComponent: PublicPageSkeleton,
});
