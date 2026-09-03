import { createFileRoute } from "@tanstack/react-router";
import FreebiesPage from "@/pages/FreebiesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/freebies")({
  component: () => <FreebiesPage />,
  pendingComponent: PublicPageSkeleton,
});
