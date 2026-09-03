import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/contact")({
  component: () => <ContactPage />,
  pendingComponent: PublicPageSkeleton,
});
