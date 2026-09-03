import { createFileRoute } from "@tanstack/react-router";
import MyListingsPage from "@/pages/MyListingsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/my-listings")({
  component: () => <MyListingsPage />,
  pendingComponent: PublicPageSkeleton,
});
