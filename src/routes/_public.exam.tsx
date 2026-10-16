import { examsListingQuery } from "@/lib/queries/listingQueries";
import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ExamsListingPage from "@/pages/ExamsListingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/exam")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(examsListingQuery); },
  head: () => publicPageHead('/exam', 'MBA Entrance Exams: Dates & Eligibility | MBA Compass', 'Explore CAT, XAT, NMAT, SNAP and other MBA entrance exams. Check exam dates, registration, eligibility, syllabus and preparation resources.'),
  component: () => <ExamsListingPage />,
  pendingComponent: PublicPageSkeleton,
});
