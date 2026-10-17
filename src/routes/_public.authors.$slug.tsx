import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { AUTHORS } from "@/pages/AuthorsPage";
import AuthorDetailPage from "@/pages/AuthorDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/authors/$slug")({
  loader: ({ params }) => { const author = AUTHORS.find((a) => a.slug === params.slug); if (!author) throw notFound(); return { author }; },
  head: ({ params, loaderData }) => publicPageHead(`/authors/${params.slug}`, `${loaderData?.author.name || "Author"} | MBA Compass`, loaderData?.author.short || "MBA Compass author information."),
  component: () => <AuthorDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
