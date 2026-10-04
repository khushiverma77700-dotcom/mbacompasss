type EditableOption = { option_html?: string; is_correct?: boolean };

const textOnly = (value: unknown) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function getMockQuestionErrors(question: {
  question_html?: unknown;
  question_type?: unknown;
  options?: EditableOption[];
  tita_correct_answers?: unknown;
  explanation_html?: unknown;
  topic?: unknown;
}): string[] {
  const errors: string[] = [];
  const questionText = textOnly(question.question_html);
  const explanation = textOnly(question.explanation_html);
  if (questionText.length < 35) errors.push("Question content must be complete and at least 35 characters.");
  if (!textOnly(question.topic)) errors.push("Add a topic so the question can be checked and classified.");
  if (explanation.length < 80) errors.push("Add a clear step-by-step explanation of at least 80 characters.");

  if (String(question.question_type ?? "mcq") === "mcq") {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length !== 4) errors.push("MCQ must have exactly four options.");
    if (options.some((option) => !textOnly(option.option_html))) errors.push("All four option texts are required.");
    if (new Set(options.map((option) => textOnly(option.option_html).toLowerCase())).size !== options.length) {
      errors.push("All four options must be different.");
    }
    if (options.filter((option) => option.is_correct).length !== 1) errors.push("Mark exactly one correct option.");
  } else {
    const answers = Array.isArray(question.tita_correct_answers) ? question.tita_correct_answers : [];
    if (!answers.some((answer) => String(answer).trim())) errors.push("TITA needs at least one correct answer.");
  }
  return Array.from(new Set(errors));
}