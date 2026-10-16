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

// Approximate sectional raw-score bands per percentile, compiled from publicly
// reported recent CAT results. Indicative only.
export const CAT_SECTIONAL_VS_PERCENTILE = [
  { percentile: "99.5", varc: "45+", dilr: "34+", qa: "38+" },
  { percentile: "99", varc: "40+", dilr: "26+", qa: "31+" },
  { percentile: "95", varc: "31+", dilr: "20+", qa: "24+" },
  { percentile: "90", varc: "25+", dilr: "15+", qa: "18+" },
  { percentile: "85", varc: "22+", dilr: "13+", qa: "15+" },
  { percentile: "80", varc: "19+", dilr: "11+", qa: "12+" },
];

// Indicative overall-percentile targets for an interview shortlist
// (General category). Not official cut-offs; IIMs publish their own
// admission policies with minimum sectional requirements.
export const CAT_INDICATIVE_TARGETS = [
  { group: "IIM Ahmedabad, Bangalore, Calcutta", target: "99+" },
  { group: "FMS Delhi, IIM Lucknow, Kozhikode, Indore, Mumbai", target: "97 – 99" },
  { group: "IIM Shillong, Rohtak, MDI Gurgaon, SPJIMR, IIT B-schools", target: "95 – 98" },
  { group: "Newer IIMs (Trichy, Udaipur, Ranchi, Raipur, Kashipur, Nagpur)", target: "90 – 96" },
  { group: "IMT, TAPMI, Great Lakes, FORE, BIMTECH, LBSIM", target: "80 – 92" },
];

export const CAT_SCORE_EXTRA_FAQS = [
  { q: "How do I calculate my CAT score manually?", a: "Multiply your correct answers by 3, then subtract one mark for every wrong MCQ. Wrong TITA answers and unattempted questions carry no penalty. For example, 20 correct answers with 6 wrong MCQs and 2 wrong TITAs gives 20 × 3 − 6 = 54." },
  { q: "What is a good CAT score?", a: "A score that places you above the 95th percentile is generally competitive for older IIMs and top non-IIM B-schools, but you also need to clear sectional cut-offs. In recent years that has meant roughly 65 to 70 out of 204, though the figure shifts every year." },
  { q: "What is the difference between CAT score and CAT percentile?", a: "Your score measures marks earned (out of 204). Your percentile shows the share of candidates who scored below you after slot normalisation. B-school shortlists are based on percentiles, along with academics and work experience." },
  { q: "Do sectional percentiles matter?", a: "Yes. Most IIMs set a minimum percentile in each of VARC, DILR and QA. A high overall percentile with a weak section can still miss a shortlist." },
];
CAT_SCORE_EXTRA_FAQS.push(
  { q: "Is there negative marking for TITA questions in CAT?", a: "No. Type-in-the-answer questions carry +3 for a correct answer and 0 for a wrong or skipped one. Only wrong MCQs lose one mark." },
  { q: "Can my CAT score change after the final answer key?", a: "Yes. If the IIMs revise an answer after objections, your raw score can move. Recalculate using the final answer key." },
  { q: "What should I do if my CAT score is below my target?", a: "Apply to colleges whose indicative percentile matches your result, and consider other exams such as XAT, SNAP, NMAT or CMAT, which run on different schedules." },
);
