import { createFileRoute } from "@tanstack/react-router";
import MBARoiCalculatorPage from "@/pages/MBARoiCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/roi-calculator")({
  component: () => <MBARoiCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
});
