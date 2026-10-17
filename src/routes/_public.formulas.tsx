import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FormulasListPage from "@/pages/formulas/FormulasListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/formulas")({
  head: () => publicPageHead("/formulas", "Formulas | MBA Compass", "Explore formulas information, guides and resources on MBA Compass."),
  component: () => <FormulasListPage />,
  pendingComponent: PublicPageSkeleton,
});
