export type MockQuestionQualityInput = {
  question_type?: unknown;
  question_html?: unknown;
  question_text?: unknown;
  options?: unknown;
  correct_index?: unknown;
  tita_answers?: unknown;
  explanation_html?: unknown;
  explanation?: unknown;
  topic?: unknown;
};

export type MockQuestionQualityResult = {
  valid: boolean;
  errors: string[];
};

const PLACEHOLDER_PATTERNS = [
  /\b(?:lorem ipsum|tbd|todo|placeholder)\b/i,
  /\b(?:insert|add) (?:question|option|answer|explanation|passage) here\b/i,
  /\b(?:image|figure|chart|table) (?:not shown|missing|unavailable)\b/i,
  /\b(?:cannot|can't) (?:determine|answer|solve) (?:without|because)\b/i,
  /\bas an ai\b/i,
];

const LABEL_PREFIX = /^\s*(?:<[^>]+>\s*)*(?:Q(?:uestion)?\.?\s*\d+|Set\s*\d+|\(?[A-D1-4]\)?)[.):-]\s*/i;

function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBalancedMathDelimiters(value: string): boolean {
  const withoutEscaped = value.replace(/\\\$/g, "");
  const doubles = (withoutEscaped.match(/\$\$/g) || []).length;
  if (doubles % 2 !== 0) return false;
  const singles = withoutEscaped.replace(/\$\$/g, "").match(/\$/g)?.length ?? 0;
  return singles % 2 === 0;
}

function normalizedOption(value: unknown): string {
  return plainText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function validateMockQuestion(
  input: MockQuestionQualityInput,
  opts: { requireDetailedExplanation?: boolean } = {},
): MockQuestionQualityResult {
  const errors: string[] = [];
  const rawQuestion = String(input.question_html ?? input.question_text ?? "").trim();
  const question = plainText(rawQuestion);
  const explanationRaw = String(input.explanation_html ?? input.explanation ?? "").trim();
  const explanation = plainText(explanationRaw);
  const type = String(input.question_type ?? "mcq").toLowerCase();

  if (question.length < 35) errors.push("question is incomplete or too short");
  if (question.length > 12000) errors.push("question exceeds the supported length");
  if (LABEL_PREFIX.test(rawQuestion)) errors.push("question contains a duplicated number or set label");
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(`${question} ${explanation}`))) {
    errors.push("question contains placeholder or missing-content text");
  }
  if (!hasBalancedMathDelimiters(rawQuestion) || !hasBalancedMathDelimiters(explanationRaw)) {
    errors.push("LaTeX delimiters are unbalanced");
  }
  if (!plainText(input.topic)) errors.push("topic is missing");

  const minimumExplanation = opts.requireDetailedExplanation === false ? 45 : 140;
  if (explanation.length < minimumExplanation) errors.push("explanation is too short to verify the solution");

  if (type === "tita") {
    const answers = Array.isArray(input.tita_answers)
      ? input.tita_answers.map((answer) => String(answer).trim()).filter(Boolean)
      : [];
    if (answers.length === 0) errors.push("TITA answer is missing");
  } else if (type === "mcq") {
    const options = Array.isArray(input.options) ? input.options as Array<Record<string, unknown> | string> : [];
    if (options.length !== 4) {
      errors.push("MCQ must contain exactly four options");
    } else {
      const texts = options.map((option) => typeof option === "string" ? option : option?.text ?? option?.option_html ?? "");
      if (texts.some((text) => plainText(text).length === 0)) errors.push("one or more options are blank");
      if (texts.some((text) => LABEL_PREFIX.test(String(text)))) errors.push("an option contains a duplicated label");
      const unique = new Set(texts.map(normalizedOption));
      if (unique.size !== 4) errors.push("MCQ options must be distinct");

      const explicitCorrect = options.filter((option) => typeof option !== "string" && option?.is_correct === true).length;
      const correctIndex = Number(input.correct_index);
      const hasCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex <= 3;
      if (explicitCorrect > 0 && explicitCorrect !== 1) errors.push("MCQ must have exactly one correct option");
      if (explicitCorrect === 0 && !hasCorrectIndex) errors.push("MCQ correct answer is missing");
    }
  } else {
    errors.push("question type must be MCQ or TITA");
  }

  return { valid: errors.length === 0, errors };
}