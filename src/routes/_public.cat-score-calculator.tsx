import { createFileRoute } from "@tanstack/react-router";
import CATScoreCalculatorPage from "@/pages/CATScoreCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/cat-score-calculator")({
  component: () => <CATScoreCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
});
