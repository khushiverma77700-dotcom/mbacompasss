import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/formula/$slug")({
  component: () => <FormulaDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
