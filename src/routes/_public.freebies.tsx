import { freebiesQuery } from "@/lib/queries/listingQueries";
import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FreebiesPage from "@/pages/FreebiesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/freebies")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(freebiesQuery); },
  head: () => publicPageHead('/freebies', 'Free MBA Study Material & CAT PDFs | MBA Compass', 'Browse CAT, XAT, NMAT and SNAP study resources, formula sheets and preparation PDFs. Sign in to download available MBA study material.'),
  component: () => <FreebiesPage />,
  pendingComponent: PublicPageSkeleton,
});
