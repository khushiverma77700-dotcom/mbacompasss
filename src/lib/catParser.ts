// CAT Response Sheet Parser
// Parses the HTML from digialm.com CAT response sheets (TCS iON platform)

export interface ParsedQuestion {
  section: string;
  questionNumber: number;
  questionType: "MCQ" | "SA";
  status: string;
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
  const infoPanel = doc.querySelector(".main-info-pnl");
  if (infoPanel) {
    const rows = infoPanel.querySelectorAll("table tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        info[cells[0].textContent?.trim() || ""] = cells[1].textContent?.trim() || "";
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

function extractMetadata(panel: Element): Record<string, string> {
  const metadata: Record<string, string> = {};
  // The metadata table is typically the LAST table in the question panel
  // It contains rows like "Question Type : MCQ", "Status : Answered", etc.
  const allTables = panel.querySelectorAll("table");

  for (let t = allTables.length - 1; t >= 0; t--) {
    const table = allTables[t];
    const rows = table.querySelectorAll("tr");
    let foundMeta = false;

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim().replace(/\s*:\s*$/, "").replace(/\s+/g, " ") || "";
        const value = cells[1].textContent?.trim() || "";

        if (
          key === "Question Type" ||
          key === "Status" ||
          key === "Chosen Option" ||
          key === "Question ID" ||
          key === "Possible Answer" ||
          key === "Given Answer" ||
          key.startsWith("Option") ||
          key === "Answer Type" ||
          key === "Case Sensitivity"
        ) {
          metadata[key] = value;
          foundMeta = true;
        }
      }
    });

    if (foundMeta) break;
  }

  return metadata;
}

function findCorrectOption(panel: Element, questionType: string): string | null {
  if (questionType === "SA") {
    // For SA/TITA, look for "Possible Answer" in metadata
    const metadata = extractMetadata(panel);
    return metadata["Possible Answer"] || null;
  }

  // For MCQ: find the answer option with green styling (correct answer indicator)
  // The answer section starts with "Ans" and lists options
  // Correct answer: green text/image indicator
  // Wrong answer: red text/image indicator

  // Strategy 1: Look for elements with green color styling
  const allElements = panel.querySelectorAll("td, span, div, font");
  for (const el of allElements) {
    const style = (el as HTMLElement).style?.color || el.getAttribute("style") || "";
    const parentText = el.parentElement?.textContent || "";

    // Check for green color indicators
    if (
      style.includes("green") ||
      style.includes("#00") ||
      style.includes("#0f") ||
      style.includes("#0F") ||
      style.includes("rgb(0,") ||
      style.includes("rgb(0, ")
    ) {
      // Extract option number from text like "1. Option 1" or just "1"
      const text = el.textContent?.trim() || "";
      const match = text.match(/^(\d+)\./);
      if (match) return match[1];
    }
  }

  // Strategy 2: Look for the option that has a "right" or "correct" image next to it
  const imgs = panel.querySelectorAll("img");
  for (const img of imgs) {
    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";
    if (
      src.includes("right") ||
      src.includes("correct") ||
      src.includes("tick") ||
      src.includes("green") ||
      alt.includes("right") ||
      alt.includes("correct")
    ) {
      // Find nearest text with option number
      const parent = img.closest("td") || img.parentElement;
      const text = parent?.textContent?.trim() || "";
      const match = text.match(/(\d+)\./);
      if (match) return match[1];
    }
  }

  // Strategy 3: Look for the "Ans" row and check which option has the checkmark
  // Sometimes the indicator is just positioning/className
  const tdElements = panel.querySelectorAll("td");
  let foundAns = false;
  for (const td of tdElements) {
    const text = td.textContent?.trim() || "";
    if (text === "Ans") {
      foundAns = true;
      continue;
    }
    if (foundAns) {
      // The next td with an image that isn't "wrong/cross" is the correct answer
      const img = td.querySelector("img");
      if (img) {
        const src = img.getAttribute("src") || "";
        if (!src.includes("wrong") && !src.includes("cross") && !src.includes("red")) {
          const optText = td.textContent?.trim() || "";
          const match = optText.match(/(\d+)\./);
          if (match) return match[1];
        }
      }
    }
  }

  // Strategy 4: Check for colored font tags
  const fonts = panel.querySelectorAll("font[color]");
  for (const font of fonts) {
    const color = font.getAttribute("color") || "";
    if (color.toLowerCase().includes("green") || color === "#00ff00" || color === "#008000") {
      const text = font.textContent?.trim() || "";
      const match = text.match(/(\d+)\./);
      if (match) return match[1];
    }
  }

  return null;
}

function parseQuestions(doc: Document): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const sectionContainers = doc.querySelectorAll(".section-cntnr");

  sectionContainers.forEach((container) => {
    const sectionLabel = container.querySelector(".section-lbl .bold");
    const currentSection = sectionLabel?.textContent?.trim() || "Unknown";

    const questionPanels = container.querySelectorAll(".question-pnl");
    questionPanels.forEach((panel) => {
      const metadata = extractMetadata(panel);

      // Get question number
      let questionNumber = 0;
      const qBold = panel.querySelector(".questionRowTbl .bold");
      if (qBold) {
        const match = qBold.textContent?.match(/Q\.(\d+)/);
        if (match) questionNumber = parseInt(match[1]);
      }

      const questionType = (metadata["Question Type"] === "SA" ? "SA" : "MCQ") as "MCQ" | "SA";
      const status = metadata["Status"] || "Not Answered";
      const chosenOption = metadata["Chosen Option"] && metadata["Chosen Option"] !== "--"
        ? metadata["Chosen Option"]
        : null;

      const correctOption = findCorrectOption(panel, questionType);

      // Determine if correct
      let isCorrect = false;
      if (status === "Answered" || status === "Answered & Marked for Review") {
        if (chosenOption && correctOption) {
          if (questionType === "MCQ") {
            isCorrect = chosenOption === correctOption;
          } else {
            isCorrect = chosenOption.toLowerCase().trim() === correctOption.toLowerCase().trim();
          }
        }
      }

      questions.push({
        section: currentSection,
        questionNumber,
        questionType,
        status,
        chosenOption,
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

  const sectionOrder = ["VARC", "DILR", "QA"];
  const allSections = Array.from(sectionMap.keys());
  const orderedSections = sectionOrder.filter((s) => allSections.includes(s));
  allSections.forEach((s) => {
    if (!orderedSections.includes(s)) orderedSections.push(s);
  });

  return orderedSections.map((section) => {
    const sectionQs = sectionMap.get(section) || [];
    const total = sectionQs.length;
    const attempted = sectionQs.filter(
      (q) => q.status === "Answered" || q.status === "Answered & Marked for Review"
    ).length;
    const correct = sectionQs.filter((q) => q.isCorrect).length;

    // MCQ wrong answers get -1, SA wrong answers get 0 (no negative marking for TITA)
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
    const score = correct * 3 - mcqIncorrect * 1; // +3 correct, -1 MCQ wrong, 0 SA wrong
    const maxScore = total * 3;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    return { section, total, attempted, correct, incorrect, unattempted, score, maxScore, accuracy };
  });
}

function estimatePercentile(totalScore: number): number {
  // Approximate CAT percentile based on historical data
  const brackets: [number, number][] = [
    [200, 99.99], [170, 99.9], [150, 99.5], [130, 99], [115, 98],
    [105, 97], [95, 95], [85, 93], [75, 90], [65, 85],
    [55, 80], [45, 70], [35, 60], [25, 45], [15, 30],
    [5, 15], [0, 5], [-10, 1],
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
      totalQuestions, attempted, correct, incorrect, unattempted,
      totalScore, maxScore, accuracy,
    },
    estimatedPercentile: estimatePercentile(totalScore),
  };
}
