import { createFileRoute } from "@tanstack/react-router";
import AdminTestimonials from "@/pages/admin/AdminTestimonials";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/testimonials")({
  component: () => <AdminTestimonials />,
  pendingComponent: PublicPageSkeleton,
});
