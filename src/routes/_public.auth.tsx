import { createFileRoute } from "@tanstack/react-router";
import AuthPage from "@/pages/AuthPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/auth")({
  component: () => <AuthPage />,
  pendingComponent: PublicPageSkeleton,
});
