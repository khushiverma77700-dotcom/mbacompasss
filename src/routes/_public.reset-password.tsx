import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/reset-password")({
  head: () => privatePageHead("/reset-password", "Reset Password | MBA Compass", "Explore reset password information, guides and resources on MBA Compass."),
  component: () => <ResetPasswordPage />,
  pendingComponent: PublicPageSkeleton,
});
