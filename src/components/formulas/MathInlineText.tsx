// Renders prose that contains bare inline LaTeX fragments (e.g. S_{\infty},
// r^{n}, \frac{a}{b}, \cdot, \ge) without requiring $...$ delimiters.
// The model often emits explanations like:
//   "as n grows, r^{n} tends to 0 when |r|<1, so S_n = g_1\cdot \frac{1}{1-r}"
// We detect math "atoms", merge adjacent atoms separated only by operators
// or whitespace into a single expression, and KaTeX-render each run inline.
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "isomorphic-dompurify";

// One math "atom" — a LaTeX command / unicode operator with brace groups and
// scripts, OR a sub/superscript on a letter. This keeps larger runs such as
// \prod_{i=1}^{n}\left(1-\frac{d_i}{100}\right) together for KaTeX.
const BRACE_GROUP = String.raw`\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}`;
const SCRIPT_GROUP = String.raw`[_^](?:${BRACE_GROUP}|[A-Za-z0-9]+)`;
const ATOM_RE =
  new RegExp(
    String.raw`\\[a-zA-Z]+(?:\s*(?:${BRACE_GROUP}|${SCRIPT_GROUP}))*|[∏ΣΠ](?:\s*${SCRIPT_GROUP})*|[A-Za-z]${SCRIPT_GROUP}`,
    "g",
  );

// Characters allowed BETWEEN atoms when merging into one math run.
// Keep it conservative so we don't engulf prose.
const CONNECTOR_RE = /^[\s+\-*/=<>().,;:{}_^|%0-9]+$/;

function softenUnbalancedDelimiters(expr: string): string {
  const left = expr.match(/\\left\b/g)?.length ?? 0;
  const right = expr.match(/\\right\b/g)?.length ?? 0;
  if (left === right) return expr;
  return expr.replace(/\\left\s*/g, "").replace(/\\right\s*/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(expr: string): string {
  try {
    return katex.renderToString(softenUnbalancedDelimiters(normalizeMathExpression(expr)), {
      displayMode: false,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return escapeHtml(expr);
  }
}

function normalizeMathExpression(expr: string): string {
  return String(expr || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u0008/g, "\\b")
    .replace(/\u0009/g, "\\t")
    .replace(/\u000c/g, "\\f")
    .replace(/(^|[\s=({[+\-*/,:;])rac\{/g, "$1\\frac{")
    .replace(/(^|[\s=({[+\-*/,:;])ext\{/g, "$1\\text{")
    .replace(/(^|[\s=({[+\-*/,:;])extstyle\b/g, "$1\\textstyle")
    .replace(/(^|[\s=({[+\-*/,:;])igg\b/g, "$1\\bigg")
    .replace(/(^|[\s=({[+\-*/,:;])ar\{/g, "$1\\bar{")
    .replace(/∈\s*N\b/g, "\\in \\mathbb{N}")
    .replace(/∈\s*Z\b/g, "\\in \\mathbb{Z}")
    .replace(/∈\s*Q\b/g, "\\in \\mathbb{Q}")
    .replace(/∈\s*R\b/g, "\\in \\mathbb{R}")
    .replace(/∈/g, "\\in ")
    .replace(/ℕ/g, "\\mathbb{N}")
    .replace(/ℤ/g, "\\mathbb{Z}")
    .replace(/ℚ/g, "\\mathbb{Q}")
    .replace(/ℝ/g, "\\mathbb{R}")
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/≠/g, "\\neq")
    .replace(/×/g, "\\times")
    .replace(/÷/g, "\\div")
    .replace(/…/g, "\\ldots")
    .trim();
}

function renderBareMathAtoms(text: string): string {
  const matches: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  ATOM_RE.lastIndex = 0;
  while ((m = ATOM_RE.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length });
  }
  if (matches.length === 0) return escapeHtml(text);

  const merged: { start: number; end: number }[] = [];
  for (const cur of matches) {
    const last = merged[merged.length - 1];
    if (last) {
      const gap = text.slice(last.end, cur.start);
      if (gap.length <= 12 && CONNECTOR_RE.test(gap)) {
        last.end = cur.end;
        continue;
      }
    }
    merged.push({ ...cur });
  }

  let out = "";
  let cursor = 0;
  for (const r of merged) {
    while (r.end < text.length && /[\s+\-*/=<>().,;:{}_^|%0-9]/.test(text[r.end])) {
      r.end += 1;
    }
    out += escapeHtml(text.slice(cursor, r.start));
    out += renderInline(text.slice(r.start, r.end));
    cursor = r.end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}

export function renderMathInline(text: string): string {
  if (!text) return "";

  const cleaned = String(text).replace(/[\u200B-\u200D\uFEFF]/g, "");
  const delimiterRe = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$([^$\n]+?)\$/g;
  let out = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = delimiterRe.exec(cleaned)) !== null) {
    out += renderBareMathAtoms(cleaned.slice(cursor, match.index));
    out += renderInline(match[1] ?? match[2] ?? match[3] ?? "");
    cursor = match.index + match[0].length;
  }

  if (cursor > 0) {
    out += renderBareMathAtoms(cleaned.slice(cursor));
    return out;
  }

  return renderBareMathAtoms(cleaned);
}

export function MathInlineText({
  text,
  className,
  as: As = "span",
}: {
  text?: string | null;
  className?: string;
  as?: "span" | "p" | "div" | "li";
}) {
  const html = useMemo(() => {
    const rendered = renderMathInline(text || "");
    return DOMPurify.sanitize(rendered, {
      ADD_TAGS: [
        "math", "mrow", "mi", "mo", "mn", "msup", "msub", "msubsup",
        "mfrac", "msqrt", "mroot", "mtext", "annotation", "semantics",
        "mspace", "mstyle", "munder", "mover", "munderover",
        "mtable", "mtr", "mtd", "mpadded", "mphantom", "menclose",
      ],
      ADD_ATTR: [
        "xmlns", "encoding", "mathvariant", "stretchy", "minsize", "maxsize",
        "displaystyle", "scriptlevel", "style", "class", "aria-hidden",
      ],
    });
  }, [text]);

  return (
    <As
      className={className}
      // KaTeX-rendered HTML, sanitized above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MathInlineText;
