import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockThankYouPage from "@/pages/mocks/MockThankYouPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/thank-you")({
  head: () => privatePageHead("/mocks/thank-you", "Thank You | MBA Compass", "Explore thank you information, guides and resources on MBA Compass."),
  component: () => <MockThankYouPage />,
  pendingComponent: PublicPageSkeleton,
});
