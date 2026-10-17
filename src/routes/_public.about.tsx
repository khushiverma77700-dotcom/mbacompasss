import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/pages/AboutPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/about")({
  head: () => publicPageHead("/about", "About | MBA Compass", "Explore about information, guides and resources on MBA Compass."),
  component: () => <AboutPage />,
  pendingComponent: PublicPageSkeleton,
});
