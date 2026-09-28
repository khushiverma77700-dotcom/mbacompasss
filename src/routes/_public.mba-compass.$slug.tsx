import { createFileRoute } from "@tanstack/react-router";
import MBACompassCourseDetailPage from "@/pages/MBACompassCourseDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/$slug")({
  head: () => ({
    meta: [
      { title: "MBA Entrance Mock Course | MBA Compass" },
      { name: "description", content: "Explore MBA Compass mock course details, included tests, analytics, access, pricing and no-refund terms before enrollment." },
      { property: "og:title", content: "MBA Entrance Mock Course | MBA Compass" },
      { property: "og:description", content: "Explore MBA Compass mock course details, analytics, access, pricing and no-refund terms before enrollment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MBACompassCourseDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
