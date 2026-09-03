import { createFileRoute } from "@tanstack/react-router";
import CollegeProgrammeRedirect from "@/pages/CollegeProgrammeRedirect";

export const Route = createFileRoute("/college/$slug/programme/$programmeSlug")({
  component: () => <CollegeProgrammeRedirect />,
});
