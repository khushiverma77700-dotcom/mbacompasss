import { createFileRoute } from "@tanstack/react-router";
import StudentOverview from "@/pages/student/StudentOverview";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Performance Dashboard | MBA Compass" },
      { name: "description", content: "Track CAT mock scores, accuracy, study progress, exam milestones and personalized preparation insights." },
      { property: "og:title", content: "Student Performance Dashboard | MBA Compass" },
      { property: "og:description", content: "Track CAT mock scores, accuracy, study progress, exam milestones and personalized preparation insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <StudentOverview />,
  pendingComponent: StudentContentSkeleton,
});
