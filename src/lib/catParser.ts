// CAT Response Sheet Parser
// Parses the HTML from digialm.com CAT response sheets

export interface ParsedQuestion {
  section: string;        // VARC, DILR, QA
  questionNumber: number;
  questionType: "MCQ" | "SA";  // SA = TITA (Type In The Answer)
  status: "Answered" | "Not Answered" | "Marked for Review" | "Not Visited";
  chosenOption: string | null;
  correctOption: string | null;
  isCorrect: boolean;
}

export interface SectionScore {
  section: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface CATResult {
  candidateName: string;
  applicationNo: string;
  testDate: string;
  testTime: string;
  subject: string;
  questions: ParsedQuestion[];
  sections: SectionScore[];
  overall: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    totalScore: number;
    maxScore: number;
    accuracy: number;
  };
  estimatedPercentile: number;
}

function extractCandidateInfo(doc: Document) {
  const info: Record<string, string> = {};
  // The info table is in .main-info-pnl > table
  const infoTable = doc.querySelector(".main-info-pnl table");
  if (infoTable) {
    const rows = infoTable.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim() || "";
        const value = cells[1].textContent?.trim() || "";
        info[key] = value;
      }
    });
  }
  return {
    candidateName: info["Candidate Name"] || "Unknown",
    applicationNo: info["Application No"] || "",
    testDate: info["Test Date"] || "",
    testTime: info["Test Time"] || "",
    subject: info["Subject"] || "CAT",
  };
}

function parseQuestions(doc: Document): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let currentSection = "";

  // Iterate through section containers
  const sectionContainers = doc.querySelectorAll(".section-cntnr");

  sectionContainers.forEach((container) => {
    // Get section name
    const sectionLabel = container.querySelector(".section-lbl .bold");
    if (sectionLabel) {
      currentSection = sectionLabel.textContent?.trim() || "";
    }

    // Get all question panels in this section
    const questionPanels = container.querySelectorAll(".question-pnl");

    questionPanels.forEach((panel) => {
      // Extract question metadata from the menu-tbl
      const menuTable = panel.querySelector(".menu-tbl");
      if (!menuTable) return;

      const metadata: Record<string, string> = {};
      const menuRows = menuTable.querySelectorAll("tr");
      menuRows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim().replace(/\s*:\s*$/, "") || "";
          const value = cells[1].textContent?.trim() || "";
          metadata[key] = value;
        }
      });

      const questionType = (metadata["Question Type"] || "MCQ") as "MCQ" | "SA";
      const status = (metadata["Status"] || "Not Answered") as ParsedQuestion["status"];
      const chosenOption = metadata["Chosen Option"] || null;

      // Get question number from the bold Q.N text
      const qNumEl = panel.querySelector(".questionRowTbl .bold");
      let questionNumber = 0;
      if (qNumEl) {
        const match = qNumEl.textContent?.match(/Q\.(\d+)/);
        if (match) questionNumber = parseInt(match[1]);
      }

      // Determine correct answer
      let correctOption: string | null = null;

      if (questionType === "MCQ") {
        // For MCQ: the correct answer has a green checkmark image (right-answer or cross/tick icon)
        // The answer row table has options with img indicators
        const answerTable = panel.querySelector(".questionRowTbl");
        if (answerTable) {
          // Look for the green tick - typically an img with src containing "right" or "correct" or tick
          const allTds = answerTable.querySelectorAll("td");
          allTds.forEach((td) => {
            const img = td.querySelector("img");
            const text = td.textContent?.trim() || "";
            if (img) {
              const src = img.getAttribute("src") || "";
              // Green tick image indicates correct answer
              if (src.includes("right") || src.includes("correct") || src.includes("tick")) {
                // The option number is in a sibling or parent text
                const optMatch = text.match(/(\d+)\./);
                if (optMatch) {
                  correctOption = optMatch[1];
                }
              }
            }
          });
        }

        // Fallback: look for the answer in the Ans row
        if (!correctOption) {
          // Sometimes correct answer is indicated with specific styling
          const ansRows = panel.querySelectorAll("tr");
          ansRows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            cells.forEach((cell) => {
              // Look for green-colored text which is the correct answer
              const greenSpans = cell.querySelectorAll('span[style*="color"]');
              greenSpans.forEach((span) => {
                const style = span.getAttribute("style") || "";
                if (style.includes("green") || style.includes("#0") || style.includes("rgb(0")) {
                  const optMatch = span.textContent?.match(/(\d+)/);
                  if (optMatch) correctOption = optMatch[1];
                }
              });
            });
          });
        }
      } else {
        // SA/TITA: Look for "Possible Answer" in the metadata
        correctOption = metadata["Possible Answer"] || null;
      }

      // For SA: check "Given Answer" or extract from the panel
      let givenAnswer = chosenOption;
      if (questionType === "SA") {
        // Look for Given Answer in metadata
        givenAnswer = metadata["Given Answer"] || metadata["Chosen Option"] || null;
      }

      // Determine if correct
      let isCorrect = false;
      if (status === "Answered" && correctOption) {
        if (questionType === "MCQ") {
          isCorrect = chosenOption === correctOption;
        } else {
          // SA: case-insensitive comparison
          isCorrect = (givenAnswer || "").toLowerCase() === (correctOption || "").toLowerCase();
        }
      }

      questions.push({
        section: currentSection,
        questionNumber,
        questionType,
        status,
        chosenOption: questionType === "SA" ? givenAnswer : chosenOption,
        correctOption,
        isCorrect,
      });
    });
  });

  return questions;
}

function calculateSectionScores(questions: ParsedQuestion[]): SectionScore[] {
  const sectionMap = new Map<string, ParsedQuestion[]>();

  questions.forEach((q) => {
    const existing = sectionMap.get(q.section) || [];
    existing.push(q);
    sectionMap.set(q.section, existing);
  });

  const sections: SectionScore[] = [];

  // Maintain order: VARC, DILR, QA
  const sectionOrder = ["VARC", "DILR", "QA"];
  const allSections = Array.from(sectionMap.keys());
  const orderedSections = sectionOrder.filter((s) => allSections.includes(s));
  // Add any remaining sections
  allSections.forEach((s) => {
    if (!orderedSections.includes(s)) orderedSections.push(s);
  });

  orderedSections.forEach((section) => {
    const sectionQs = sectionMap.get(section) || [];
    const total = sectionQs.length;
    const attempted = sectionQs.filter(
      (q) => q.status === "Answered" || q.status === "Answered & Marked for Review"
    ).length;
    const correct = sectionQs.filter((q) => q.isCorrect).length;

    // For incorrect: MCQ wrong = -1, SA wrong = 0
    const mcqIncorrect = sectionQs.filter(
      (q) =>
        q.questionType === "MCQ" &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review") &&
        !q.isCorrect
    ).length;

    const saIncorrect = sectionQs.filter(
      (q) =>
        q.questionType === "SA" &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review") &&
        !q.isCorrect
    ).length;

    const incorrect = mcqIncorrect + saIncorrect;
    const unattempted = total - attempted;

    // Score: +3 for correct, -1 for MCQ incorrect, 0 for SA incorrect
    const score = correct * 3 - mcqIncorrect * 1;
    const maxScore = total * 3;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    sections.push({
      section,
      total,
      attempted,
      correct,
      incorrect,
      unattempted,
      score,
      maxScore,
      accuracy,
    });
  });

  return sections;
}

function estimatePercentile(totalScore: number): number {
  // Rough CAT percentile estimates based on historical data
  // These are approximate and based on CAT 2024/2025 trends
  const brackets: [number, number][] = [
    [200, 99.99],
    [170, 99.9],
    [150, 99.5],
    [130, 99],
    [115, 98],
    [105, 97],
    [95, 95],
    [85, 93],
    [75, 90],
    [65, 85],
    [55, 80],
    [45, 70],
    [35, 60],
    [25, 45],
    [15, 30],
    [5, 15],
    [0, 5],
    [-10, 1],
  ];

  for (const [score, percentile] of brackets) {
    if (totalScore >= score) return percentile;
  }
  return 0.5;
}

export function parseCATResponseSheet(htmlContent: string): CATResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const candidateInfo = extractCandidateInfo(doc);
  const questions = parseQuestions(doc);
  const sections = calculateSectionScores(questions);

  const totalQuestions = questions.length;
  const attempted = questions.filter(
    (q) => q.status === "Answered" || q.status === "Answered & Marked for Review"
  ).length;
  const correct = questions.filter((q) => q.isCorrect).length;
  const incorrect = attempted - correct;
  const unattempted = totalQuestions - attempted;

  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const maxScore = sections.reduce((sum, s) => sum + s.maxScore, 0);
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  return {
    ...candidateInfo,
    questions,
    sections,
    overall: {
      totalQuestions,
      attempted,
      correct,
      incorrect,
      unattempted,
      totalScore,
      maxScore,
      accuracy,
    },
    estimatedPercentile: estimatePercentile(totalScore),
  };
}
