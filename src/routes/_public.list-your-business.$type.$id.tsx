import { createFileRoute } from "@tanstack/react-router";
import ListingFormPage from "@/pages/ListingFormPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business/$type/$id")({
  component: () => <ListingFormPage />,
  pendingComponent: PublicPageSkeleton,
});
