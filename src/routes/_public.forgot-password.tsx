import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/forgot-password")({
  head: () => privatePageHead("/forgot-password", "Forgot Password | MBA Compass", "Explore forgot password information, guides and resources on MBA Compass."),
  component: () => <ForgotPasswordPage />,
  pendingComponent: PublicPageSkeleton,
});
