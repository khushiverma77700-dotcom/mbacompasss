import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CATScoreCalculatorPage from "@/pages/CATScoreCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { CAT_CALCULATOR_FAQS, CAT_SCORE_EXTRA_FAQS, CAT_SCORE_VS_PERCENTILE, CAT_SECTIONAL_VS_PERCENTILE, CAT_INDICATIVE_TARGETS } from "@/lib/catScorePercentile";

const URL = "https://mbacompass.in/cat-score-calculator";
const TITLE = "CAT Score Calculator 2026 & CAT Score vs Percentile";
const DESC =
  "Calculate CAT marks from your response sheet. Check VARC, DILR and QA scores and compare indicative CAT score vs percentile bands.";

export const Route = createFileRoute("/_public/cat-score-calculator")({
  component: () => <CATScoreCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
  head: () => ({
    ...publicPageHead("/cat-score-calculator", TITLE, DESC),
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
              "@type": "Article",
              "@id": `${URL}#article`,
              headline: "CAT Score Calculator 2026 and CAT Score vs Percentile Guide",
              description: DESC,
              inLanguage: "en-IN",
              dateModified: "2026-10-17",
              author: { "@id": "https://mbacompass.in/#org" },
              publisher: { "@id": "https://mbacompass.in/#org" },
              mainEntityOfPage: { "@id": `${URL}#webpage` },
              articleSection: ["How to calculate CAT score", "CAT score vs percentile", "Sectional percentile", "B-school targets"],
            },
            {
              "@type": "LearningResource",
              name: "CAT score and percentile guide",
              url: URL,
              learningResourceType: ["Calculator", "Reference table", "Guide"],
              educationalLevel: "Postgraduate entrance",
              teaches: ["CAT marking scheme", "CAT score calculation", "CAT percentile estimation"],
              audience: { "@type": "EducationalAudience", educationalRole: "student", audienceType: "CAT aspirants" },
              isAccessibleForFree: true,
              provider: { "@id": "https://mbacompass.in/#org" },
            },
            {
              "@type": "ItemList",
              name: "Indicative CAT percentile targets by B-school group",
              itemListElement: CAT_INDICATIVE_TARGETS.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: `${r.group}: ${r.target} percentile (indicative)` })),
            },
            {
              "@type": "ItemList",
              name: "CAT score vs percentile bands",
              itemListElement: CAT_SCORE_VS_PERCENTILE.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: `${r.percentile} percentile: approx. ${r.score} out of 204` })),
            },
            {
              "@type": "DefinedTermSet",
              name: "CAT scoring terms",
              hasDefinedTerm: [
                { "@type": "DefinedTerm", name: "Raw score", description: "Marks earned in CAT: +3 per correct answer, -1 per wrong MCQ, 0 for wrong TITA or unattempted." },
                { "@type": "DefinedTerm", name: "Scaled score", description: "Raw score normalised across CAT slots to adjust for difficulty." },
                { "@type": "DefinedTerm", name: "CAT percentile", description: "Share of candidates who scored below you after normalisation." },
                { "@type": "DefinedTerm", name: "TITA", description: "Type In The Answer question with no negative marking." },
                { "@type": "DefinedTerm", name: "Sectional cut-off", description: "Minimum percentile required in VARC, DILR or QA by a B-school." },
              ],
            },
            {
              "@type": "SiteNavigationElement",
              name: ["How to calculate CAT score", "CAT score vs percentile", "Profile Analyzer", "MBA applications"],
              url: [`${URL}#how-to-calculate-cat-score`, `${URL}#cat-score-vs-percentile`, "https://mbacompass.in/profile-analyzer", "https://mbacompass.in/mba-application"],
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
