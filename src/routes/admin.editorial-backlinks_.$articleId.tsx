import { createFileRoute } from "@tanstack/react-router";
import AdminEditorialBacklinks from "@/pages/admin/AdminEditorialBacklinks";

export const Route = createFileRoute("/admin/editorial-backlinks_/$articleId")({
  head: ({ params }) => ({ meta: [
    { title: `Blog Link Dossier ${params.articleId} | MBA Compass Admin` },
    { name: "description", content: "Inspect saved links, automatically linked names and related first-party destinations for this blog." },
    { property: "og:title", content: `Blog Link Dossier ${params.articleId} | MBA Compass` },
    { property: "og:description", content: "Related colleges, exams, coaching institutes and tools with live destination links." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: BlogDossier,
});
function BlogDossier() { const { articleId } = Route.useParams(); return <AdminEditorialBacklinks articleId={articleId} />; }