import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockResultPage from "@/pages/mocks/MockResultPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/result/$attemptId")({
  head: ({ params }) => publicPageHead(`/mocks/result/${params.attemptId}`, `${params.attemptId} | MBA Compass`, "Explore attemptid information, guides and resources on MBA Compass."),
  component: () => <MockResultPage />,
  pendingComponent: PublicPageSkeleton,
});
