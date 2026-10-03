// AI deliverability review for admin email campaigns and templates.
// Flags spam-trigger / overly promotional wording field by field and proposes
// a rewritten email. Nothing is applied until the admin approves it in the UI.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface EmailReviewInput {
  fromName: string;
  subject: string;
  heading: string;
  bodyHtml: string;
  ctas: { label: string; url: string }[];
}

export interface EmailReviewFlag {
  field: "fromName" | "subject" | "heading" | "body" | "button";
  severity: "high" | "medium" | "low";
  text: string;
  reason: string;
}

export interface EmailReviewResult {
  score: number;
  verdict: "inbox_likely" | "at_risk" | "spam_likely";
  summary: string;
  flags: EmailReviewFlag[];
  suggestion: EmailReviewInput;
}

const SYSTEM = `You are an email deliverability expert reviewing an email that an Indian MBA-prep company (MBA Compass) sends to its own registered users.
Goal: maximise inbox placement in Gmail/Outlook (avoid Spam and Promotions where possible).
Flag, field by field: spam-trigger words (free, guaranteed, act now, limited time, urgent, winner, 100%, cash, discount, offer, buy now, click here, risk-free, etc.), ALL CAPS, excessive punctuation (!!!, ???), emojis, currency/percent-heavy hype, misleading subject lines, vague "click here" buttons, link-heavy or image-only bodies, overly salesy tone, and missing personal/helpful context.
Then write ONE improved version that keeps the same meaning, facts, links and {{variables}} exactly, sounds like a helpful personal note from an advisor, uses plain professional wording, no emojis, no ALL CAPS, subject under 60 characters, clear specific button text.
Never invent facts, prices, dates or links. Keep button URLs identical and in the same order. Body must be simple HTML using only <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href>, <br>, <h3>, and must keep every existing <img> tag with the same src; give each image a short descriptive alt text if it has none.
Only flag problems that actually appear in the text provided, and only problems your improved version fixes. Never flag {{variables}}, link URLs, image URLs, the unsubscribe footer or tracking, since the admin cannot change them. If the email is already clean, return an empty flags list - do not invent minor issues.
Return ONLY JSON with this exact shape:
{"score":0-100,"verdict":"inbox_likely"|"at_risk"|"spam_likely","summary":"one or two sentences","flags":[{"field":"fromName"|"subject"|"heading"|"body"|"button","severity":"high"|"medium"|"low","text":"the exact problem word or phrase","reason":"short reason"}],"suggestion":{"fromName":"","subject":"","heading":"","bodyHtml":"","ctas":[{"label":"","url":""}]}}`;

function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export const reviewEmailWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: EmailReviewInput) => {
    if (!i || typeof i.subject !== "string" || typeof i.bodyHtml !== "string") throw new Error("Invalid email");
    if (!i.subject.trim() && !i.bodyHtml.trim()) throw new Error("Write the email first");
    return {
      fromName: String(i.fromName || "").slice(0, 200),
      subject: String(i.subject || "").slice(0, 500),
      heading: String(i.heading || "").slice(0, 500),
      bodyHtml: String(i.bodyHtml || "").slice(0, 30000),
      ctas: (Array.isArray(i.ctas) ? i.ctas : []).slice(0, 2).map((c) => ({ label: String(c?.label || "").slice(0, 200), url: String(c?.url || "").slice(0, 2000) })),
    };
  })
  .handler(async ({ data, context }): Promise<EmailReviewResult> => {
    const { data: isAdmin } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: SYSTEM,
        input: [{ role: "user", content: `Review this email:\n${JSON.stringify(data)}` }],
      }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      console.error("[email-ai-review] gateway error", res.status, detail.slice(0, 300));
      if (res.status === 429) throw new Error("AI is busy right now. Please try again in a minute.");
      if (res.status === 402) throw new Error("AI credits are used up. Add credits in workspace settings.");
      throw new Error("AI review failed. Please try again.");
    }

    // Read the SSE stream and collect the output text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("AI review failed. Please try again.");
        } catch (e: any) {
          if (e?.message?.startsWith("AI review failed")) throw e;
        }
      }
    }

    let parsed: any;
    try { parsed = extractJson(out); } catch { throw new Error("AI returned an unreadable answer. Please try again."); }
    const s = parsed?.suggestion ?? {};
    // Keep the admin's button URLs: AI may only change wording.
    const fieldText: Record<string, string> = {
      fromName: data.fromName, subject: data.subject, heading: data.heading,
      body: data.bodyHtml, button: data.ctas.map((c) => c.label).join(" "),
    };
    const norm = (t: string) => t.toLowerCase().replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    // Drop flags about text that isn't in the email, and about things the admin can't change.
    const keepFlag = (f: EmailReviewFlag) => {
      const t = f.text.trim();
      if (!t) return true;
      if (/\{\{|https?:\/\/|unsubscribe/i.test(t)) return false;
      if (/alt\s*=/i.test(t)) return /alt\s*=\s*(""|'')/i.test(data.bodyHtml);
      const hay = norm(fieldText[f.field] ?? "") + " " + norm(data.bodyHtml);
      return hay.includes(norm(t).replace(/^["']|["']$/g, "")) || norm(t).length > 80;
    };
    const fillAlt = (html: string) => html.replace(/<img\b([^>]*?)\s*alt\s*=\s*(""|'')([^>]*)>/gi, '<img$1 alt="Image from MBA Compass"$3>').replace(/<img\b(?![^>]*\balt=)([^>]*)>/gi, '<img alt="Image from MBA Compass"$1>');
    const ctas = data.ctas.map((c, i) => ({ label: String(s?.ctas?.[i]?.label || c.label), url: c.url }));
    const verdict = ["inbox_likely", "at_risk", "spam_likely"].includes(parsed?.verdict) ? parsed.verdict : "at_risk";
    return {
      score: Math.max(0, Math.min(100, Number(parsed?.score) || 0)),
      verdict,
      summary: String(parsed?.summary || ""),
      flags: (Array.isArray(parsed?.flags) ? parsed.flags : []).slice(0, 30).map((f: any): EmailReviewFlag => ({
        field: ["fromName", "subject", "heading", "body", "button"].includes(f?.field) ? f.field : "body",
        severity: ["high", "medium", "low"].includes(f?.severity) ? f.severity : "medium",
        text: String(f?.text || ""),
        reason: String(f?.reason || ""),
      })).filter(keepFlag),
      suggestion: {
        fromName: String(s.fromName || data.fromName),
        subject: String(s.subject || data.subject),
        heading: String(s.heading ?? data.heading),
        bodyHtml: fillAlt(String(s.bodyHtml || data.bodyHtml)),
        ctas,
      },
    };
  });
