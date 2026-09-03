import { createFileRoute } from "@tanstack/react-router";
import MockCheckoutReturnPage from "@/pages/mocks/MockCheckoutReturnPage";

export const Route = createFileRoute("/mocks/checkout/return")({
  component: () => <MockCheckoutReturnPage />,
});
