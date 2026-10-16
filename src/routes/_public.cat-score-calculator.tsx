import { createFileRoute } from "@tanstack/react-router";
import CATScoreCalculatorPage from "@/pages/CATScoreCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { CAT_CALCULATOR_FAQS, CAT_SCORE_EXTRA_FAQS } from "@/lib/catScorePercentile";

const URL = "https://mbacompass.in/cat-score-calculator";
const TITLE = "CAT Score Calculator 2026 & CAT Score vs Percentile | MBA Compass";
const DESC =
  "Free CAT score calculator: paste your response sheet for an exact VARC, DILR and QA score, then check the CAT score vs percentile table to estimate your percentile.";

export const Route = createFileRoute("/_public/cat-score-calculator")({
  component: () => <CATScoreCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: "CAT Score Calculator",
              url: URL,
              description: DESC,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              isAccessibleForFree: true,
            },
            {
              "@type": "FAQPage",
              mainEntity: [...CAT_CALCULATOR_FAQS, ...CAT_SCORE_EXTRA_FAQS].map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in/" },
                { "@type": "ListItem", position: 2, name: "CAT Score Calculator", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
});
