import type { TrackerRow } from "@/lib/applicationTracker";

/**
 * Detailed cost-of-application / cost-of-attendance model.
 *
 * Only two money columns are stored per college (`application_fee`,
 * `program_fee`), so the fine-grained lines below are indicative splits of the
 * published programme fee plus standard India MBA out-of-pocket costs. Every
 * derived line carries its own note so students can see exactly how the number
 * was arrived at instead of trusting a single opaque total.
 */

export type ExpenseLine = {
  label: string;
  amount: number | null;
  note: string;
  /** true when the number comes straight from the college's published data. */
  actual: boolean;
};

export type ExpenseGroup = {
  title: string;
  caption: string;
  lines: ExpenseLine[];
  total: number | null;
};

export type ExpenseBreakdown = {
  groups: ExpenseGroup[];
  /** Published programme fee, when the college has declared one. */
  programmeTotal: number | null;
  /** Everything a student spends before classes start. */
  applicationStageTotal: number;
  /** Living + one-time costs on top of the programme fee. */
  additionalTotal: number;
  grandTotal: number | null;
  hasProgrammeFee: boolean;
};

/** Indicative split of a published two-year MBA programme fee. */
const PROGRAMME_SPLIT: { label: string; share: number; note: string }[] = [
  {
    label: "Tuition & academic fee",
    share: 0.72,
    note: "Core teaching, faculty and academic delivery — the largest slice of the published fee.",
  },
  {
    label: "Hostel & accommodation",
    share: 0.13,
    note: "On-campus residence for both years where the fee is bundled; day-scholars pay rent instead.",
  },
  {
    label: "Mess & food plan",
    share: 0.07,
    note: "Compulsory mess charges billed per term on most residential campuses.",
  },
  {
    label: "Books, cases & software",
    share: 0.04,
    note: "Case-study licences, textbooks, Bloomberg/analytics access and lab software.",
  },
  {
    label: "Student activities, alumni & admin",
    share: 0.04,
    note: "Committees, clubs, convocation, alumni membership and examination administration.",
  },
];

/** Standard exam registration fee used when the exam's own fee is not listed. */
const EXAM_FEE_ESTIMATE = 2_500;

const rupees = (value: number): number => Math.round(value / 100) * 100;

const sum = (lines: ExpenseLine[]): number =>
  lines.reduce((acc, line) => acc + (line.amount ?? 0), 0);

type Input = Pick<
  TrackerRow,
  "name" | "category" | "application_fee" | "program_fee" | "accepted_exams"
>;

export const buildExpenseBreakdown = (row: Input): ExpenseBreakdown => {
  const isExam = row.category === "exam";
  const programmeFee = row.program_fee ?? null;
  const exams = (row.accepted_exams ?? []).filter((e) => !!e.trim());

  /* ------------------------------------------------ 1. application stage */
  const applicationLines: ExpenseLine[] = [
    {
      label: isExam ? "Exam registration fee" : "Application / form fee",
      amount: row.application_fee ?? null,
      note: row.application_fee === null
        ? "Not published yet — check the official form before the last date."
        : "Paid online on the official portal at the time of submitting the form. Non-refundable.",
      actual: true,
    },
  ];

  if (!isExam && exams.length > 0) {
    applicationLines.push({
      label: `Entrance exam registration (${exams.slice(0, 4).join(", ")})`,
      amount: rupees(Math.min(exams.length, 3) * EXAM_FEE_ESTIMATE),
      note: `Indicative at about ₹${EXAM_FEE_ESTIMATE.toLocaleString("en-IN")} per exam attempt for up to three accepted exams.`,
      actual: false,
    });
  }

  applicationLines.push(
    {
      label: "Document & verification charges",
      amount: 1_500,
      note: "Transcripts, attestation, photographs, category/EWS certificates and courier.",
      actual: false,
    },
    {
      label: "Interview & GD/PI travel",
      amount: 8_000,
      note: "Indicative return travel plus one night's stay for a single interview city.",
      actual: false,
    },
    {
      label: "Interview preparation",
      amount: 6_000,
      note: "Mock interviews, SOP/essay review and profile-building support. Skip if self-prepared.",
      actual: false,
    },
  );

  const applicationGroup: ExpenseGroup = {
    title: isExam ? "Exam registration stage" : "Application stage costs",
    caption: "What you spend before an offer — form fee, exam attempts, documents and interviews.",
    lines: applicationLines,
    total: sum(applicationLines),
  };

  /* ------------------------------------------------- 2. programme fee */
  const programmeLines: ExpenseLine[] = programmeFee
    ? PROGRAMME_SPLIT.map((part) => ({
        label: part.label,
        amount: rupees(programmeFee * part.share),
        note: `${Math.round(part.share * 100)}% of the published ${isExam ? "programme" : "course"} fee. ${part.note}`,
        actual: false,
      }))
    : [
        {
          label: isExam ? "Programme fee" : "Total programme fee",
          amount: null,
          note: "The institute has not published a consolidated fee for this intake yet.",
          actual: true,
        },
      ];

  const programmeGroup: ExpenseGroup = {
    title: "Programme fee breakdown",
    caption: programmeFee
      ? `Indicative split of the published fee of ₹${programmeFee.toLocaleString("en-IN")} across the full programme.`
      : "Fee not published yet for this intake.",
    lines: programmeLines,
    total: programmeFee ?? null,
  };

  /* ------------------------------------- 3. costs outside the fee slip */
  const extraLines: ExpenseLine[] = [
    {
      label: "Laptop & one-time setup",
      amount: 65_000,
      note: "Most B-schools mandate a personal laptop; includes bag, formals and campus kit.",
      actual: false,
    },
    {
      label: "Personal & travel expenses (2 years)",
      amount: 96_000,
      note: "About ₹4,000 a month for phone, laundry, local travel and home visits.",
      actual: false,
    },
    {
      label: "Student exchange / international immersion",
      amount: 150_000,
      note: "Optional term abroad or immersion module, charged separately when opted for.",
      actual: false,
    },
    {
      label: "Health insurance & medical",
      amount: 12_000,
      note: "Campus health cover for two years, usually billed with the first term.",
      actual: false,
    },
  ];

  const extraGroup: ExpenseGroup = {
    title: "Costs outside the fee slip",
    caption: "Real spends that never appear on the official fee structure — budget for these separately.",
    lines: extraLines,
    total: sum(extraLines),
  };

  /* -------------------------------------------------- 4. loan servicing */
  const loanPrincipal = programmeFee ? rupees(programmeFee * 0.7) : null;
  const loanInterest = loanPrincipal ? rupees(loanPrincipal * 0.095 * 2) : null;
  const financeLines: ExpenseLine[] = [
    {
      label: "Education loan principal (indicative)",
      amount: loanPrincipal,
      note: "Assumes 70% of the programme fee is financed and 30% funded from savings.",
      actual: false,
    },
    {
      label: "Interest during the two study years",
      amount: loanInterest,
      note: "At about 9.5% a year on the financed amount, before any moratorium subsidy.",
      actual: false,
    },
  ];

  const financeGroup: ExpenseGroup = {
    title: "If you take an education loan",
    caption: "Interest accrued while you study, which is over and above the fee itself.",
    lines: financeLines,
    total: loanInterest === null ? null : sum(financeLines.slice(1)),
  };

  const applicationStageTotal = applicationGroup.total ?? 0;
  const additionalTotal = extraGroup.total ?? 0;
  const grandTotal =
    programmeFee === null ? null : programmeFee + applicationStageTotal + additionalTotal;

  const groups = isExam
    ? [applicationGroup, programmeGroup]
    : [applicationGroup, programmeGroup, extraGroup, financeGroup];

  return {
    groups,
    programmeTotal: programmeFee,
    applicationStageTotal,
    additionalTotal,
    grandTotal,
    hasProgrammeFee: programmeFee !== null,
  };
};
