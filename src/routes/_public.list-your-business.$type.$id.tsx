import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ListingFormPage from "@/pages/ListingFormPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business/$type/$id")({
  head: ({ params }) => privatePageHead(`/list-your-business/${params.type}/${params.id}`, `${params.id} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <ListingFormPage />,
  pendingComponent: PublicPageSkeleton,
});
