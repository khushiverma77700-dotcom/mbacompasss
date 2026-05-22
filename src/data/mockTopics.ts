// Topic catalog for AI mock generation, keyed by exam → section code.
// Used by the admin "Generate Mocks From AI" dialog (Topic-wise category)
// and by the student dashboard to group topic-wise mocks under each topic.
export const MOCK_TOPIC_CATALOG: Record<string, Record<string, string[]>> = {
  CAT: {
    QA: [
      "Arithmetic — Percentages",
      "Arithmetic — Profit & Loss",
      "Arithmetic — Ratio & Proportion",
      "Arithmetic — Time, Speed & Distance",
      "Arithmetic — Time & Work",
      "Arithmetic — Averages, Mixtures & Alligations",
      "Arithmetic — Simple & Compound Interest",
      "Algebra — Linear & Quadratic Equations",
      "Algebra — Inequalities & Modulus",
      "Algebra — Functions & Graphs",
      "Algebra — Logarithms, Surds & Indices",
      "Algebra — Progressions (AP, GP, HP)",
      "Number System",
      "Geometry — Triangles",
      "Geometry — Circles",
      "Geometry — Quadrilaterals & Polygons",
      "Mensuration (2D & 3D)",
      "Coordinate Geometry",
      "Trigonometry",
      "Permutations & Combinations",
      "Probability",
      "Set Theory & Venn Diagrams",
    ],
    VARC: [
      "Reading Comprehension — Inference",
      "Reading Comprehension — Main Idea",
      "Reading Comprehension — Tone & Style",
      "Reading Comprehension — Vocabulary in Context",
      "Para Jumbles",
      "Para Summary",
      "Odd One Out (Para Completion)",
      "Sentence Completion",
      "Critical Reasoning",
      "Vocabulary & Usage",
    ],
    DILR: [
      "Tables & Caselets",
      "Bar / Line / Pie Charts",
      "Data Sufficiency",
      "Arrangements (Linear, Circular, Matrix)",
      "Distribution & Selection Puzzles",
      "Games & Tournaments",
      "Routes & Networks",
      "Venn Diagram based LR",
      "Quant-based DI (Growth, Ratios, Averages)",
    ],
  },
  XAT: {
    VALR: ["Reading Comprehension", "Para Jumbles", "Para Completion", "Critical Reasoning", "Analogies", "Grammar & Usage", "Vocabulary"],
    DM: ["Ethical Dilemmas", "Business Decision Cases", "Stakeholder Conflicts", "Resource Allocation", "Data-based Decisions"],
    QADI: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "P&C / Probability", "Data Interpretation", "Data Sufficiency"],
    GK: ["Static GK", "Business & Economy", "Current Affairs", "Awards & Honours", "Sports"],
  },
  NMAT: {
    LS: ["Reading Comprehension", "Para Jumbles", "Sentence Correction", "Vocabulary (Synonyms / Antonyms)", "Fill in the Blanks", "Idioms & Phrases"],
    LR: ["Arrangements", "Coding-Decoding", "Blood Relations", "Syllogisms", "Series", "Statement & Assumption", "Data Sufficiency"],
    QS: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Modern Math (P&C, Probability)", "DI — Tables & Charts", "Quant-based DS"],
  },
  SNAP: {
    GE: ["Reading Comprehension", "Vocabulary", "Grammar & Usage", "Para Jumbles", "Idioms & Phrases", "Analogies"],
    AR: ["Arrangements & Puzzles", "Series", "Coding-Decoding", "Blood Relations", "Syllogisms", "Critical Reasoning"],
    QADS: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Data Interpretation", "Data Sufficiency"],
  },
  IIFT: {
    VARC: ["Reading Comprehension", "Vocabulary", "Grammar", "Para Jumbles", "Analogies"],
    QA: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Modern Math"],
    DILR: ["Tables & Caselets", "Charts", "Arrangements", "Puzzles", "Data Sufficiency"],
    GK: ["Static GK", "Business & Economy", "International Trade", "Current Affairs", "Awards & Honours"],
  },
  CMAT: {
    QADI: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Data Interpretation"],
    LR: ["Arrangements", "Coding-Decoding", "Blood Relations", "Syllogisms", "Series", "Statement & Conclusion"],
    LC: ["Reading Comprehension", "Vocabulary", "Grammar", "Para Jumbles", "Sentence Correction"],
    GA: ["Static GK", "Current Affairs", "Business & Economy", "Sports", "Awards"],
    IE: ["Indian Startups & Unicorns", "Government Schemes (Startup India, MUDRA)", "Business Jargon", "Entrepreneur Profiles", "Funding & VC"],
  },
  MAT: {
    LC: ["Reading Comprehension", "Vocabulary", "Grammar", "Para Jumbles", "Sentence Correction"],
    MS: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Modern Math"],
    DA: ["Tables & Caselets", "Charts", "Data Sufficiency", "Data Comparison"],
    ICR: ["Arrangements", "Coding-Decoding", "Blood Relations", "Syllogisms", "Critical Reasoning"],
    IGE: ["Static GK", "Current Affairs", "Business & Economy", "International Affairs", "Awards & Sports"],
  },
};

export function getTopicsFor(examCode: string, sectionCode: string): string[] {
  return MOCK_TOPIC_CATALOG[examCode]?.[sectionCode] ?? [];
}
