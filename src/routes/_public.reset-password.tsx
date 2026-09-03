import { createFileRoute } from "@tanstack/react-router";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/reset-password")({
  component: () => <ResetPasswordPage />,
  pendingComponent: PublicPageSkeleton,
});
