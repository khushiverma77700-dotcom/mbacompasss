import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import BusinessInquiryPage from "@/pages/BusinessInquiryPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/business-inquiries")({
  head: () => publicPageHead("/business-inquiries", "Business Inquiries | MBA Compass", "Explore business inquiries information, guides and resources on MBA Compass."),
  component: () => <BusinessInquiryPage />,
  pendingComponent: PublicPageSkeleton,
});
