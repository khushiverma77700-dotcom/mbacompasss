import { createFileRoute } from "@tanstack/react-router";
import CollegesPage from "@/pages/CollegesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges")({
  component: () => <CollegesPage />,
  pendingComponent: PublicPageSkeleton,
});
