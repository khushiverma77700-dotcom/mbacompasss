import { createFileRoute } from "@tanstack/react-router";
import AdminInformationPortal from "@/pages/admin/AdminInformationPortal";

export const Route = createFileRoute("/admin/information-portal")({
  component: AdminInformationPortal,
  head: () => ({ meta: [
    { title: "College & Exam Information | MBA Compass" },
    { name: "description", content: "Research, verify, approve, and publish college and entrance exam information." },
    { property: "og:title", content: "College & Exam Information | MBA Compass" },
    { property: "og:description", content: "Research, verify, approve, and publish college and entrance exam information." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});