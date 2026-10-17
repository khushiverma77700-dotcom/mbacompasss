import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ListingFormPage from "@/pages/ListingFormPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business/$type/$id")({
  head: ({ params }) => publicPageHead(`/list-your-business/${params.type}/${params.id}`, `${params.id} | MBA Compass`, "Explore id information, guides and resources on MBA Compass."),
  component: () => <ListingFormPage />,
  pendingComponent: PublicPageSkeleton,
});
