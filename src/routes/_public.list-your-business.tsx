import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ListYourBusinessPage from "@/pages/ListYourBusinessPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business")({
  head: () => publicPageHead("/list-your-business", "List Your Business | MBA Compass", "Explore list your business information, guides and resources on MBA Compass."),
  component: () => <ListYourBusinessPage />,
  pendingComponent: PublicPageSkeleton,
});
