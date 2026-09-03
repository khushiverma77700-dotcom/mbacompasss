import { createFileRoute } from "@tanstack/react-router";
import LegacyCollegeSlugRedirect from "@/pages/LegacyCollegeSlugRedirect";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/$slug")({
  component: () => <LegacyCollegeSlugRedirect />,
  pendingComponent: PublicPageSkeleton,
});
