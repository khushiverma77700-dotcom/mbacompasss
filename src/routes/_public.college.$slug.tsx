import { createFileRoute } from "@tanstack/react-router";
import CollegeDetailPage from "@/pages/CollegeDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { detailHead, prefetchDetail } from "@/lib/detailPageSeo";

export const Route = createFileRoute("/_public/college/$slug")({
  loader: async ({ context, params }) => ({
    row: await prefetchDetail(context.queryClient, "colleges", params.slug),
  }),
  head: ({ loaderData, params }) =>
    detailHead({
      row: loaderData?.row,
      path: `/college/${params.slug}`,
      fallbackTitle: "MBA College Details | MBA Compass",
      fallbackDescription: "MBA college fees, placements, admissions and courses on MBA Compass.",
      titleFrom: (r) => `${r.name} — Fees & Placements | MBA Compass`,
      descriptionFrom: (r) => r.description_short || r.description || `${r.name}${r.city ? `, ${r.city}` : ""}: MBA fees, placements, cutoffs and admission details.`,
      type: "website",
    }),
  component: () => <CollegeDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
