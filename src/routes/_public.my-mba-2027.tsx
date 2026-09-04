import { createFileRoute } from "@tanstack/react-router";
import ApplicationTrackerPage from "@/pages/tracker/ApplicationTrackerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { publicTrackersQuery } from "@/lib/applicationTracker";

const TITLE = "MBA College & Exam Application Tracker 2027 — Deadlines, Fees & Apply Links";
const DESCRIPTION =
  "Track every MBA entrance exam and B-school application in one place. Live deadlines, application fees, programme fees, accepted exams and official apply links for IIMs and top non-IIM colleges.";

export const Route = createFileRoute("/_public/my-mba-2027")({
  // Prefetched server-side so the SSR HTML ships real college names, deadlines
  // and fees (crawlable) instead of the loading skeleton.
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(publicTrackersQuery);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ApplicationTrackerPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <ApplicationTrackerPage />,
});
