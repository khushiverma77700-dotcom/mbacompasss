import { createFileRoute } from "@tanstack/react-router";
import MockThankYouPage from "@/pages/mocks/MockThankYouPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/thank-you")({
  component: () => <MockThankYouPage />,
  pendingComponent: PublicPageSkeleton,
});
