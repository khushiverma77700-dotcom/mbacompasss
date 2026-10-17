import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MyMocksPage from "@/pages/mocks/MyMocksPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/dashboard/mocks")({
  head: () => publicPageHead("/dashboard/mocks", "Mocks | MBA Compass", "Explore mocks information, guides and resources on MBA Compass."),
  component: () => <MyMocksPage />,
  pendingComponent: PublicPageSkeleton,
});
