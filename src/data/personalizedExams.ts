// Exam → sections catalog for the Personalized Mock Hub
export type ExamCode = "CAT" | "NMAT" | "XAT" | "SNAP" | "IIFT" | "CMAT" | "MAT";

export const EXAMS: { code: ExamCode; name: string; sections: string[] }[] = [
  {
    code: "CAT",
    name: "CAT",
    sections: ["VARC", "DILR", "QA"],
  },
  {
    code: "NMAT",
    name: "NMAT",
    sections: ["Language Skills", "Quantitative Skills", "Logical Reasoning"],
  },
  {
    code: "XAT",
    name: "XAT",
    sections: ["Verbal & Logical Ability", "Decision Making", "Quantitative Ability", "GK"],
  },
  {
    code: "SNAP",
    name: "SNAP",
    sections: ["General English", "Quantitative & Data Interpretation", "Analytical & Logical Reasoning"],
  },
  {
    code: "IIFT",
    name: "IIFT",
    sections: ["Verbal Ability & RC", "Quantitative Analysis", "Data Interpretation & LR", "GK"],
  },
  {
    code: "CMAT",
    name: "CMAT",
    sections: ["Quantitative Techniques", "Logical Reasoning", "Language Comprehension", "GK", "Innovation & Entrepreneurship"],
  },
  {
    code: "MAT",
    name: "MAT",
    sections: ["Language Comprehension", "Mathematical Skills", "Data Analysis", "Intelligence & Critical Reasoning", "Indian & Global Environment"],
  },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "difficult", label: "Difficult" },
  { value: "mixed", label: "Mixed" },
];

export function getExam(code: string) {
  return EXAMS.find((e) => e.code === code);
}
