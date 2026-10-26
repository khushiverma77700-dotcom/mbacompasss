import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { formulaDetailQuery, formulaRelatedQuery } from "@/lib/queries/formulaQueries";

export const Route = createFileRoute("/_public/formula/$slug")({
  // Prefetch the formula (and its related links) server-side so the served
  // HTML carries the full content, unique title/description and internal
  // links instead of a client-rendered skeleton.
  loader: async ({ context, params }) => {
    const formula = await context.queryClient.ensureQueryData(formulaDetailQuery(params.slug));
    if (formula?.topic_slug) {
      await context.queryClient.ensureQueryData(formulaRelatedQuery(formula.topic_slug, params.slug));
    }
    return formula ? { name: formula.name, seoTitle: formula.seo_title, seoDescription: formula.seo_description, explanation: formula.explanation } : null;
  },
  head: ({ params, loaderData }) =>
    publicPageHead(
      `/formula/${params.slug}`,
      loaderData?.seoTitle || (loaderData?.name ? `${loaderData.name} — Formula, Examples & Shortcuts | MBA Compass` : `${params.slug} | MBA Compass`),
      loaderData?.seoDescription || loaderData?.explanation || "Explore MBA colleges, entrance exams and preparation resources on MBA Compass.",
    ),
  component: () => <FormulaDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
