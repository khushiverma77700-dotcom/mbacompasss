import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/formula/$slug")({
  head: ({ params }) => publicPageHead(`/formula/${params.slug}`, `${params.slug} | MBA Compass`, "Explore slug information, guides and resources on MBA Compass."),
  component: () => <FormulaDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
