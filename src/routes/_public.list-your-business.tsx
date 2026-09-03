import { createFileRoute } from "@tanstack/react-router";
import ListYourBusinessPage from "@/pages/ListYourBusinessPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/list-your-business")({
  component: () => <ListYourBusinessPage />,
  pendingComponent: PublicPageSkeleton,
});
