import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import CollegeDetailPage from "@/pages/CollegeDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { detailHead, prefetchDetail, findSeoRedirect } from "@/lib/detailPageSeo";
import { collegeDescription, collegeTitle } from "@/lib/collegeSeo";
import { generateCollegeSchema } from "@/components/SEOHead";
import { canonicalUrl } from "@/lib/canonical";

export const Route = createFileRoute("/_public/college/$slug")({
  loader: async ({ context, params }) => {
    // Duplicate college pages permanently point to the strongest copy.
    const to = await findSeoRedirect(`/college/${params.slug}`);
    if (to) throw redirect({ href: to, statusCode: 301 });
    const row = await prefetchDetail(context.queryClient, "colleges", params.slug);
    if (!row) throw notFound();
    return { row };
  },
  head: ({ loaderData, params }) => {
    const row = loaderData?.row;
    const base = detailHead({
      row: row ? { ...row, meta_title: collegeTitle(row), meta_description: collegeDescription(row) } : row,
      path: `/college/${params.slug}`,
      fallbackTitle: "MBA College Details | MBA Compass",
      fallbackDescription: "MBA college fees, placements, admissions and courses on MBA Compass.",
      titleFrom: (r) => collegeTitle(r),
      descriptionFrom: (r) => collegeDescription(r),
      type: "website",
    });
    if (!row) return base;
    let school: unknown = null;
    try { school = generateCollegeSchema(row); } catch { school = null; }
    const crumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
        { "@type": "ListItem", position: 2, name: "Colleges", item: canonicalUrl("/colleges") },
        { "@type": "ListItem", position: 3, name: row.name, item: canonicalUrl(`/college/${params.slug}`) },
      ],
    };
    return {
      ...base,
      scripts: [
        ...(school ? [{ type: "application/ld+json", children: JSON.stringify(school) }] : []),
        { type: "application/ld+json", children: JSON.stringify(crumbs) },
      ],
    };
  },
  component: () => <CollegeDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
