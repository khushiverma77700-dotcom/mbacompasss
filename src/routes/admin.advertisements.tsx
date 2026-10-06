import { createFileRoute } from "@tanstack/react-router";
import AdminAdvertisements from "@/pages/admin/AdminAdvertisements";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/advertisements")({
  head: () => ({ meta: [{ title: "Advertisement Manager | MBA Compass Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminAdvertisements />,
  pendingComponent: PublicPageSkeleton,
});
