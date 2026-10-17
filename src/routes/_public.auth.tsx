import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import AuthPage from "@/pages/AuthPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/auth")({
  head: () => privatePageHead("/auth", "Auth | MBA Compass", "Explore auth information, guides and resources on MBA Compass."),
  component: () => <AuthPage />,
  pendingComponent: PublicPageSkeleton,
});
