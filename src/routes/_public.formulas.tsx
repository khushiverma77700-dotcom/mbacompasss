import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import FormulasListPage from "@/pages/formulas/FormulasListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { formulasListQuery, quantTopicsQuery } from "@/lib/queries/formulaQueries";

export const Route = createFileRoute("/_public/formulas")({
  head: () => publicPageHead("/formulas", "MBA Quant Formula Book — Free CAT, XAT, NMAT Formulas | MBA Compass", "Browse free, AI-explained MBA quant formulas. CAT, XAT, NMAT shortcuts, derivations, examples and practice — search 500+ formulas in one place."),
  // Prefetch server-side so the served HTML already contains every formula
  // link; without this Google saw an empty shell and formula pages stayed
  // undiscovered ("URL is unknown to Google").
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(formulasListQuery),
      context.queryClient.ensureQueryData(quantTopicsQuery),
    ]);
  },
  component: () => <FormulasListPage />,
  pendingComponent: PublicPageSkeleton,
});
