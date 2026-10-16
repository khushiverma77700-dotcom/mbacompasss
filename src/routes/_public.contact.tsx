import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/contact")({
  head: () => publicPageHead('/contact', 'Contact MBA Compass | MBA Guidance & Support', 'Contact MBA Compass for MBA preparation guidance, course questions and support. Find contact options and share your enquiry.'),
  component: () => <ContactPage />,
  pendingComponent: PublicPageSkeleton,
});
