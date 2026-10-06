import { createFileRoute } from "@tanstack/react-router";
import AdminEditorialBacklinks from "@/pages/admin/AdminEditorialBacklinks";

export const Route = createFileRoute("/admin/editorial-backlinks")({
  head: () => ({ meta: [
    { title: "Editorial Backlinks | MBA Compass Admin" },
    { name: "description", content: "Review blog-specific editorial links to MBA Compass colleges, exams, coaching institutes and tools." },
    { property: "og:title", content: "Editorial Backlinks | MBA Compass Admin" },
    { property: "og:description", content: "Blog-by-blog internal editorial link directory." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: () => <AdminEditorialBacklinks />,
});