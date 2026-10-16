// Approximate CAT score vs percentile bands, compiled from publicly reported
// CAT 2024 results (scaled scores out of 204). Slot difficulty shifts these
// every year, so the page always labels them as approximate.
export const CAT_SCORE_VS_PERCENTILE = [
  { percentile: "99.5+", score: "105+" },
  { percentile: "99", score: "88 – 95" },
  { percentile: "98", score: "78 – 84" },
  { percentile: "95", score: "65 – 70" },
  { percentile: "90", score: "52 – 56" },
  { percentile: "85", score: "44 – 48" },
  { percentile: "80", score: "38 – 42" },
  { percentile: "70", score: "30 – 33" },
  { percentile: "60", score: "24 – 27" },
];

export const CAT_CALCULATOR_FAQS = [
  { q: "How does the CAT score calculator work?", a: "Paste the HTML source of your official CAT response sheet. The calculator applies the official marking scheme (+3 for a correct answer, -1 for a wrong MCQ, 0 for a wrong TITA or unattempted question) and shows your raw score section by section for VARC, DILR and QA." },
  { q: "What is the CAT score vs percentile for 99 percentile?", a: "In recent years, a scaled score of roughly 88 to 95 out of 204 has corresponded to about the 99th percentile. The exact figure moves each year with slot difficulty, so treat it as an approximate band." },
  { q: "What score is needed for 90 percentile in CAT?", a: "A scaled score of roughly 52 to 56 has corresponded to about the 90th percentile in recent CAT results. Sectional performance also matters because most IIMs apply sectional cut-offs." },
  { q: "Is the raw score the same as the CAT scaled score?", a: "No. IIMs normalise raw scores across slots to produce scaled scores, and percentiles are calculated from scaled scores. Your raw score from the calculator is exact; the percentile shown is an estimate." },
  { q: "How do I get my CAT response sheet?", a: "Log in at iimcat.ac.in, open Candidate Response, then view the page source (Ctrl+U), select all and copy. Paste the copied code into the calculator." },
];
