import { createFileRoute } from "@tanstack/react-router";
import IIMWaitlistPage from "@/pages/IIMWaitlistPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/iim-waitlist-movement")({
  component: () => <IIMWaitlistPage />,
  pendingComponent: PublicPageSkeleton,
});
