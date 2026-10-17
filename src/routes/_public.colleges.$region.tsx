import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolvePluralCollege } from "@/lib/siteStructure.functions";

export const Route = createFileRoute("/_public/colleges/$region")({
  loader: async ({ params }) => {
    const target = await resolvePluralCollege({ data: { slug: params.region } });
    if (!target) throw notFound();
    throw redirect({ href: target, statusCode: 301 });
  },
  head: () => ({ meta: [{ title: "Unavailable page | MBA Compass" }, { name: "description", content: "This college or location page is unavailable." }, { property: "og:title", content: "Unavailable page | MBA Compass" }, { property: "og:description", content: "This college or location page is unavailable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
});
