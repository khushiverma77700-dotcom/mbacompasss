import { createFileRoute } from "@tanstack/react-router";
import MBACompassCourseDetailPage from "@/pages/MBACompassCourseDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/courses/$slug")({
  head: () => ({ meta: [
    { title: "Course Details & Enrollment | MBA Compass" },
    { name: "description", content: "Review MBA Compass course features, mock coverage, access, price and no-refund terms before purchase." },
    { property: "og:title", content: "Course Details & Enrollment | MBA Compass" },
    { property: "og:description", content: "Explore course inclusions, access, pricing and no-refund terms before enrolling." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <MBACompassCourseDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
