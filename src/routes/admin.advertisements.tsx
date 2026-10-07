import { createFileRoute } from "@tanstack/react-router";
import AdminAdvertisements from "@/pages/admin/AdminAdvertisements";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/advertisements")({
  head: () => ({ meta: [{ title: "Advertisement Manager | MBA Compass Admin" }, { name: "description", content: "Manage MBA Compass promotions, placements, delivery and real-page previews." }, { property: "og:title", content: "Advertisement Manager | MBA Compass Admin" }, { property: "og:description", content: "Manage first-party campaign delivery and previews." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminAdvertisements />,
  pendingComponent: PublicPageSkeleton,
});
