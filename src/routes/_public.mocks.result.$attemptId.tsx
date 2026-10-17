import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockResultPage from "@/pages/mocks/MockResultPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/result/$attemptId")({
  head: ({ params }) => privatePageHead(`/mocks/result/${params.attemptId}`, `${params.attemptId} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <MockResultPage />,
  pendingComponent: PublicPageSkeleton,
});
