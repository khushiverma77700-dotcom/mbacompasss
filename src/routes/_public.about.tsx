import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/pages/AboutPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/about")({
  component: () => <AboutPage />,
  pendingComponent: PublicPageSkeleton,
});
