import { createFileRoute } from "@tanstack/react-router";
import ApplicationTrackerPage from "@/pages/tracker/ApplicationTrackerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { publicTrackersQuery } from "@/lib/applicationTracker";
import { canonicalUrl } from "@/lib/canonical";

const TITLE = "MBA Application Form 2027: College-Wise Deadlines, Fees & Applications";
const DESCRIPTION =
  "Apply online to top MBA colleges and entrance exams in one place — college-wise application last dates, application fees, MBA fees, CAT/XAT/GMAT acceptance, cutoffs and placements for IIMs, Tier 1 and Tier 2 B-schools.";

export const Route = createFileRoute("/_public/mba-application/")({
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
    links: [{ rel: "canonical", href: canonicalUrl("/mba-application") }],
  }),
  component: () => <ApplicationTrackerPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <ApplicationTrackerPage />,
});
