import { createFileRoute } from "@tanstack/react-router";
import ApplicationTrackerPage from "@/pages/tracker/ApplicationTrackerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { publicTrackersQuery } from "@/lib/applicationTracker";
import {
  APPLICATION_BASE,
  APPLICATION_YEAR,
  breadcrumbSchema,
  collectionSchema,
  faqSchema,
  listingFaqs,
  mainPageMeta,
} from "@/lib/applicationSeo";

const KEYWORDS = [
  `MBA application form ${APPLICATION_YEAR}`,
  `MBA application last date ${APPLICATION_YEAR}`,
  "MBA application deadline",
  "MBA application fee",
  "IIM application form",
  "CAT application form",
  "XAT application form",
  "MBA admission 2027",
  "MBA college application",
  "apply online MBA",
  "MBA entrance exam registration",
  "Tier 1 MBA colleges application",
];

export const Route = createFileRoute("/_public/mba-application/")({
  loader: async ({ context }) => {
    const rows = await context.queryClient.ensureQueryData(publicTrackersQuery);
    return { meta: mainPageMeta(rows), rows };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.meta) return { meta: [{ title: "MBA Applications" }] };
    const { meta, rows } = loaderData;
    const faqs = listingFaqs(rows);
    return {
      meta: [
        { title: meta.title },
        { name: "description", content: meta.description },
        { name: "keywords", content: KEYWORDS.join(", ") },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: meta.canonical },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: meta.title },
        { name: "twitter:description", content: meta.description },
      ],
      links: [{ rel: "canonical", href: meta.canonical }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(collectionSchema(meta, rows)) },
        { type: "application/ld+json", children: JSON.stringify(faqSchema(faqs)) },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: `MBA Applications ${APPLICATION_YEAR}`, url: APPLICATION_BASE },
            ]),
          ),
        },
      ],
    };
  },
  component: () => <ApplicationTrackerPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <ApplicationTrackerPage />,
});
