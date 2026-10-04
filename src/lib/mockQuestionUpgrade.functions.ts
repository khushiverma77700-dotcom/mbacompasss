import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type UpgradeOption = { option_html: string; is_correct: boolean };
type UpgradeProposal = {
  question_type: "mcq" | "tita"; question_html: string; difficulty: "hard"; topic: string;
  options: UpgradeOption[]; tita_correct_answers: string[]; tita_numeric_tolerance: number | null; explanation_html: string;
};

const plainText = (value: unknown) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned an unreadable question. Please try again.");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeProposal(raw: Record<string, unknown>, type: "mcq" | "tita"): UpgradeProposal {
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  const options = rawOptions.map((item) => {
    const option = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { option_html: String(option.option_html ?? option.text ?? "").trim(), is_correct: option.is_correct === true };
  });
  const answers = Array.isArray(raw.tita_correct_answers) ? raw.tita_correct_answers.map(String).map((v) => v.trim()).filter(Boolean) : [];
  const proposal: UpgradeProposal = {
    question_type: type, question_html: String(raw.question_html ?? "").trim(), difficulty: "hard", topic: String(raw.topic ?? "").trim(),
    options: type === "mcq" ? options : [], tita_correct_answers: type === "tita" ? answers : [],
    tita_numeric_tolerance: type === "tita" && Number.isFinite(Number(raw.tita_numeric_tolerance)) ? Number(raw.tita_numeric_tolerance) : null,
    explanation_html: String(raw.explanation_html ?? "").trim(),
  };
  const errors: string[] = [];
  if (plainText(proposal.question_html).length < 35) errors.push("question is incomplete");
  if (!plainText(proposal.topic)) errors.push("topic is missing");
  if (plainText(proposal.explanation_html).length < 140) errors.push("explanation is too short");
  if (type === "mcq") {
    if (proposal.options.length !== 4) errors.push("four options are required");
    if (proposal.options.some((o) => !plainText(o.option_html))) errors.push("an option is blank");
    if (new Set(proposal.options.map((o) => plainText(o.option_html).toLowerCase())).size !== 4) errors.push("options must be distinct");
    if (proposal.options.filter((o) => o.is_correct).length !== 1) errors.push("exactly one option must be correct");
  } else if (!proposal.tita_correct_answers.length) errors.push("TITA answer is missing");
  if (errors.length) throw new Error(`Generated draft failed quality checks: ${errors.join(", ")}.`);
  return proposal;
}

async function requireAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Only administrators can upgrade mock questions.");
}

export const generateTougherQuestionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questionId: string }) => {
    if (!input?.questionId || typeof input.questionId !== "string") throw new Error("Select a question first.");
    return { questionId: input.questionId };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: existing } = await context.supabase.from("mock_question_upgrade_reviews").select("id").eq("question_id", data.questionId).eq("status", "pending").maybeSingle();
    if (existing) throw new Error("This question already has a draft waiting for review.");
    const { data: question, error } = await context.supabase
      .from("mock_questions")
      .select("*, mock_question_options(option_html,is_correct,sort_order), mock_sections(code,name,test_id,mock_tests(name,exam_code)), mock_passages(content_html)")
      .eq("id", data.questionId).single();
    if (error || !question) throw new Error(error?.message ?? "Question not found.");
    if (question.difficulty !== "easy") throw new Error("Only questions marked Easy can be upgraded with this action.");
    const sourceSnapshot = {
      question_type: question.question_type, question_html: question.question_html, difficulty: question.difficulty, topic: question.topic,
      options: [...(question.mock_question_options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      tita_correct_answers: question.tita_correct_answers ?? [], tita_numeric_tolerance: question.tita_numeric_tolerance, explanation_html: question.explanation_html,
    };
    const section = question.mock_sections as any; const test = section?.mock_tests; const passage = question.mock_passages as any;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-4o", temperature: 0.35, response_format: { type: "json_object" }, messages: [
        { role: "system", content: "You are an elite CAT/XAT question setter and meticulous editor. Rewrite one existing EASY question into a genuinely challenging, exam-realistic HARD question for the same exam, section and topic. Preserve the tested concept and linked passage context, but add multi-step reasoning and plausible traps. Do not merely change numbers or lengthen wording. Independently solve it. Exactly one MCQ option must be correct. Return only JSON with question_type, question_html, topic, options (option_html,is_correct), tita_correct_answers, tita_numeric_tolerance, explanation_html. Use clean HTML and a detailed 220-400 word solution. Never prefix questions or options with labels. Never invent missing passage facts." },
        { role: "user", content: JSON.stringify({ exam: test?.exam_code, test: test?.name, section: section?.code, section_name: section?.name, linked_passage_html: passage?.content_html ?? null, current_question: sourceSnapshot }) },
      ] }),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("AI is busy right now. Please try again in a minute.");
      if (response.status === 402) throw new Error("AI credits are used up.");
      throw new Error("The tougher draft could not be generated. Please try again.");
    }
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const proposal = normalizeProposal(extractJson(payload.choices?.[0]?.message?.content ?? ""), question.question_type);
    const { data: review, error: insertError } = await context.supabase.from("mock_question_upgrade_reviews")
      .insert({ question_id: data.questionId, created_by: context.userId, source_snapshot: sourceSnapshot, proposed_question: proposal }).select("id").single();
    if (insertError || !review) throw new Error(insertError?.message ?? "The draft could not be saved.");
    return { id: review.id };
  });

export const reviewTougherQuestionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string; decision: "approved" | "rejected" }) => {
    if (!input?.reviewId || !["approved", "rejected"].includes(input.decision)) throw new Error("Invalid review action.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.decision === "approved") {
      const { error } = await context.supabase.rpc("approve_mock_question_upgrade", { _review_id: data.reviewId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("mock_question_upgrade_reviews").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: context.userId }).eq("id", data.reviewId).eq("status", "pending");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });