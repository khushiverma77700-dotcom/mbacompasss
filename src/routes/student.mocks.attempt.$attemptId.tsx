import { createFileRoute } from "@tanstack/react-router";
import MockTestRunnerPage from "@/pages/mocks/MockTestRunnerPage";

export const Route = createFileRoute("/student/mocks/attempt/$attemptId")({
  component: () => <MockTestRunnerPage />,
});
