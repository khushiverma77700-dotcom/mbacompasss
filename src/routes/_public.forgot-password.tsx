import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/forgot-password")({
  component: () => <ForgotPasswordPage />,
  pendingComponent: PublicPageSkeleton,
});
