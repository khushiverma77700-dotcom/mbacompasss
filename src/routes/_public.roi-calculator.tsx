import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MBARoiCalculatorPage from "@/pages/MBARoiCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/roi-calculator")({
  head: () => publicPageHead('/roi-calculator', 'MBA ROI Calculator: Fees vs Salary | MBA Compass', 'Estimate the return on your MBA investment using course fees, living costs and expected salary. Compare costs and payback periods.'),
  component: () => <MBARoiCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
});
