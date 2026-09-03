import { createFileRoute } from "@tanstack/react-router";
import ListingPocPage from "@/pages/ListingPocPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business/poc")({
  component: () => <ListingPocPage />,
  pendingComponent: PublicPageSkeleton,
});
