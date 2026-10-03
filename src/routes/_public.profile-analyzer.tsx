import { createFileRoute } from "@tanstack/react-router";
import ProfileAnalyzerPage from "@/pages/ProfileAnalyzerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/profile-analyzer")({
  head: () => ({
    meta: [
      { title: "AI MBA Profile Analyser & College Chances | MBA Compass" },
      { name: "description", content: "Assess your MBA profile, admission chances, exam strategy and college fit with a detailed MBA Compass report." },
      { property: "og:title", content: "AI MBA Profile Analyser & College Chances | MBA Compass" },
      { property: "og:description", content: "Get a detailed MBA readiness assessment with strengths, risks, exam strategy and college-fit guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ProfileAnalyzerPage />,
  pendingComponent: PublicPageSkeleton,
});
