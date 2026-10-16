import { createFileRoute, notFound } from "@tanstack/react-router";
import ExamDetailPage from "@/pages/ExamDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { detailHead, prefetchDetail } from "@/lib/detailPageSeo";

export const Route = createFileRoute("/_public/exam_/$slug")({
  loader: async ({ context, params }) => {
    const row = await prefetchDetail(context.queryClient, "exams", params.slug);
    if (!row) throw notFound();
    return { row };
  },
  head: ({ loaderData, params }) =>
    detailHead({
      row: loaderData?.row,
      path: `/exam/${params.slug}`,
      fallbackTitle: "MBA Entrance Exam Details | MBA Compass",
      fallbackDescription: "MBA entrance exam dates, pattern, syllabus and eligibility on MBA Compass.",
      titleFrom: (r) => `${r.name}${r.full_name ? ` (${r.full_name})` : ""} — Dates, Pattern & Syllabus | MBA Compass`,
      descriptionFrom: (r) => r.description || `${r.name} exam dates, eligibility, pattern, syllabus and registration details.`,
      type: "website",
    }),
  component: () => <ExamDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
