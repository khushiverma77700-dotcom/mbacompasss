import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { findSeoRedirect } from "@/lib/detailPageSeo";

// Old indexed URLs like /nirma-university-ahmedabad-mba resolve on the server
// with a real 301 (or a real 404), so Google never sees a homepage-titled page.
export const Route = createFileRoute("/_public/$slug")({
  loader: async ({ params }) => {
    const slug = params.slug;
    const admin = await findSeoRedirect(`/${slug}`);
    if (admin) throw redirect({ href: admin, statusCode: 301 });
    const candidates = Array.from(
      new Set([slug, slug.replace(/-mba-admission$/, ""), slug.replace(/-admission$/, ""), slug.replace(/-mba$/, "")]),
    );
    let target: string | null = null;
    try {
      const { data } = await supabase.from("colleges").select("slug").in("slug", candidates).limit(1).maybeSingle();
      target = data?.slug ?? null;
    } catch {
      target = null;
    }
    if (!target) throw notFound();
    const dest = (await findSeoRedirect(`/college/${target}`)) ?? `/college/${target}`;
    throw redirect({ href: dest, statusCode: 301 });
  },
  head: () => ({ meta: [{ title: "Page not found | MBA Compass" }, { name: "description", content: "This page is unavailable. Explore MBA colleges, exams and tools on MBA Compass." }, { property: "og:title", content: "Page not found | MBA Compass" }, { property: "og:description", content: "This page is unavailable. Explore MBA colleges, exams and tools on MBA Compass." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <NotFound />,
  notFoundComponent: () => <NotFound />,
});
