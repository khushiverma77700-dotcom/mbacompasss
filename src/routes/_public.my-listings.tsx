import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MyListingsPage from "@/pages/MyListingsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/my-listings")({
  head: () => privatePageHead("/my-listings", "My Listings | MBA Compass", "Explore my listings information, guides and resources on MBA Compass."),
  component: () => <MyListingsPage />,
  pendingComponent: PublicPageSkeleton,
});
