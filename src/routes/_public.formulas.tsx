import { createFileRoute } from "@tanstack/react-router";
import FormulasListPage from "@/pages/formulas/FormulasListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/formulas")({
  component: () => <FormulasListPage />,
  pendingComponent: PublicPageSkeleton,
});
