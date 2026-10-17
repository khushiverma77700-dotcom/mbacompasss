import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ListingPocPage from "@/pages/ListingPocPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business/poc")({
  head: () => privatePageHead("/list-your-business/poc", "Poc | MBA Compass", "Explore poc information, guides and resources on MBA Compass."),
  component: () => <ListingPocPage />,
  pendingComponent: PublicPageSkeleton,
});
