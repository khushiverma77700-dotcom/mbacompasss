import { createFileRoute } from "@tanstack/react-router";
import BusinessInquiryPage from "@/pages/BusinessInquiryPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/business-inquiries")({
  component: () => <BusinessInquiryPage />,
  pendingComponent: PublicPageSkeleton,
});
