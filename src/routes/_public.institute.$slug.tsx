import { createFileRoute } from "@tanstack/react-router";
import InstitutePage from "@/pages/InstitutePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/institute/$slug")({
  component: () => <InstitutePage />,
  pendingComponent: PublicPageSkeleton,
});
