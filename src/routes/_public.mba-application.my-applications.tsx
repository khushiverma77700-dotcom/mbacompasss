import { createFileRoute } from "@tanstack/react-router";
import MyApplicationsPortal from "@/pages/tracker/MyApplicationsPortal";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { canonicalUrl } from "@/lib/canonical";

const TITLE = "My MBA Applications 2027: Track Deadlines, Status & Expenses";
const DESCRIPTION =
  "Your personal MBA application portal — every college and exam you applied to, live last dates, application status, fees paid and a full expense breakdown in one place.";

export const Route = createFileRoute("/_public/mba-application/my-applications")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/mba-application/my-applications") }],
  }),
  component: MyApplicationsPortal,
  pendingComponent: PublicPageSkeleton,
  errorComponent: MyApplicationsPortal,
});
