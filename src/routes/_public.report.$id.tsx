import { createFileRoute } from "@tanstack/react-router";
import SharedReportPage from "@/pages/SharedReportPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/report/$id")({
  head: () => ({
    meta: [
      { title: "Shared MBA Profile Assessment | MBA Compass" },
      { name: "description", content: "View a shared MBA profile assessment with readiness scores, college fit and practical admissions guidance." },
      { property: "og:title", content: "Shared MBA Profile Assessment | MBA Compass" },
      { property: "og:description", content: "A detailed MBA profile report covering strengths, risks, college fit and next steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SharedReportPage />,
  pendingComponent: PublicPageSkeleton,
});
