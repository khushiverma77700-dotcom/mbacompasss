import { createFileRoute } from "@tanstack/react-router";
import MBACompassCoursesPage from "@/pages/MBACompassCoursesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/")({
  head: () => ({ meta: [
    { title: "MBA Compass Preparation Programs | Course Catalog" },
    { name: "description", content: "Find MBA Compass entrance preparation programs and compare included mocks, features, prices and no-refund terms." },
    { property: "og:title", content: "MBA Compass Preparation Programs | Course Catalog" },
    { property: "og:description", content: "Compare MBA entrance preparation programs, pricing and no-refund terms." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <MBACompassCoursesPage />,
  pendingComponent: PublicPageSkeleton,
});
