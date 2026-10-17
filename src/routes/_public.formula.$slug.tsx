import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/formula/$slug")({
  head: ({ params }) => publicPageHead(`/formula/${params.slug}`, `${params.slug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <FormulaDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
