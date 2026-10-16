import { createFileRoute } from "@tanstack/react-router";
import CATScoreCalculatorPage from "@/pages/CATScoreCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { CAT_CALCULATOR_FAQS, CAT_SCORE_EXTRA_FAQS, CAT_SCORE_VS_PERCENTILE, CAT_SECTIONAL_VS_PERCENTILE } from "@/lib/catScorePercentile";

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
              "@type": "Organization",
              "@id": "https://mbacompass.in/#org",
              name: "MBA Compass",
              url: "https://mbacompass.in/",
              logo: "https://mbacompass.in/favicon.ico",
            },
            {
              "@type": "WebSite",
              "@id": "https://mbacompass.in/#website",
              name: "MBA Compass",
              url: "https://mbacompass.in/",
              publisher: { "@id": "https://mbacompass.in/#org" },
            },
            {
              "@type": "WebPage",
              "@id": `${URL}#webpage`,
              url: URL,
              name: TITLE,
              description: DESC,
              inLanguage: "en-IN",
              isPartOf: { "@id": "https://mbacompass.in/#website" },
              publisher: { "@id": "https://mbacompass.in/#org" },
              dateModified: "2026-10-17",
              about: [
                { "@type": "Thing", name: "CAT score calculator" },
                { "@type": "Thing", name: "CAT score vs percentile" },
                { "@type": "Thing", name: "Common Admission Test" },
              ],
              speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "#cat-score-vs-percentile p"] },
              mainEntity: { "@id": `${URL}#app` },
            },
            {
              "@type": "HowTo",
              name: "How to calculate your CAT score",
              description: "Calculate your CAT raw score from your official response sheet using the +3 / -1 / 0 marking scheme.",
              totalTime: "PT2M",
              step: [
                { "@type": "HowToStep", position: 1, name: "Open your response sheet", text: "Log in to the official CAT portal and open the candidate response page for your slot." },
                { "@type": "HowToStep", position: 2, name: "Copy the page source", text: "View the page source, select all and copy it." },
                { "@type": "HowToStep", position: 3, name: "Paste into the calculator", text: "Paste the copied code into the MBA Compass CAT score calculator and submit." },
                { "@type": "HowToStep", position: 4, name: "Apply the marking scheme", text: "Each correct answer earns 3 marks, each wrong MCQ loses 1 mark, and wrong TITA or unattempted questions score 0." },
                { "@type": "HowToStep", position: 5, name: "Compare with percentile bands", text: "Compare your total and sectional scores with the CAT score vs percentile tables to estimate your percentile." },
              ],
            },
            {
              "@type": "Dataset",
              name: "CAT Score vs Percentile (approximate)",
              description: "Approximate CAT scaled score bands (out of 204) and sectional raw scores corresponding to percentiles, compiled from publicly reported recent CAT results. Indicative only; bands shift every year.",
              url: `${URL}#cat-score-vs-percentile`,
              creator: { "@id": "https://mbacompass.in/#org" },
              isAccessibleForFree: true,
              keywords: ["CAT score vs percentile", "CAT percentile", "CAT sectional percentile"],
              variableMeasured: ["CAT percentile", "Overall scaled score", "VARC score", "DILR score", "QA score"],
              license: "https://mbacompass.in/terms",
            },
            {
              "@type": "Table",
              about: "CAT score vs percentile",
              name: "CAT score vs percentile table",
              description: CAT_SCORE_VS_PERCENTILE.map((r) => `${r.percentile} percentile: ${r.score}`).join("; "),
            },
            {
              "@type": "Table",
              about: "CAT sectional score vs percentile",
              name: "Sectional CAT score vs percentile",
              description: CAT_SECTIONAL_VS_PERCENTILE.map((r) => `${r.percentile} percentile: VARC ${r.varc}, DILR ${r.dilr}, QA ${r.qa}`).join("; "),
            },
            {
              "@type": "WebApplication",
              "@id": `${URL}#app`,
              publisher: { "@id": "https://mbacompass.in/#org" },
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
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
