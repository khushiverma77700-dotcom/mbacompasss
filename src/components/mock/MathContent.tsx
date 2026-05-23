import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "isomorphic-dompurify";

interface MathContentProps {
  html: string;
  className?: string;
}

/**
 * Renders rich HTML content with inline + block LaTeX math.
 *
 * Robust against messy AI output:
 *   - Handles $$...$$, \[...\], \(...\), $...$
 *   - Strips stray escape backslashes the LLM sometimes emits (\$ -> $)
 *   - Currency-aware: skips $100, $1,500.50, $ 99 etc.
 *   - Auto-promotes common bare LaTeX like \frac{a}{b} or x^2 that the model
 *     forgot to wrap, so fractions/powers still render.
 */

// Common LaTeX tokens — used to decide if an unwrapped chunk should be math.
const LATEX_TOKEN_RE = /\\(?:frac|sqrt|sum|prod|int|lim|cdot|times|div|leq|geq|neq|approx|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|left|right|begin|end|mathbb|mathrm|text|overline|underline|vec)\b/;

const renderInline = (expr: string): string => {
  try {
    return katex.renderToString(expr, { displayMode: false, throwOnError: false, output: "html" });
  } catch {
    return expr;
  }
};

const renderBlock = (expr: string): string => {
  try {
    return katex.renderToString(expr, { displayMode: true, throwOnError: false, output: "html" });
  } catch {
    return expr;
  }
};

const renderMath = (input: string): string => {
  if (!input) return "";

  let out = input;

  // Normalize: LLMs sometimes emit \\$ or \\(. Collapse double backslashes
  // that precede math delimiters into a single backslash so our regex matches.
  out = out.replace(/\\\\(\$|\(|\)|\[|\])/g, "\\$1");

  // 1. Block math: $$ ... $$
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => renderBlock(String(expr).trim()));

  // 2. Block math: \[ ... \]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => renderBlock(String(expr).trim()));

  // 3. Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr) => renderInline(String(expr).trim()));

  // 4. Inline math: $ ... $  (currency-aware)
  out = out.replace(/\$([^\$\n<>]+?)\$/g, (m, expr) => {
    const e = String(expr).trim();
    if (!e) return m;
    // Pure number / currency-looking → leave as-is
    if (/^[\d,]+(?:\.\d+)?$/.test(e)) return m;
    // Reject if it looks like a price tag with units only e.g. "100 USD"
    if (/^[\d,.\s]+(?:USD|INR|EUR|GBP|Rs\.?)?$/i.test(e)) return m;
    return renderInline(e);
  });

  // 5. Escaped dollar that wasn't part of math — unescape \$ to $
  out = out.replace(/\\\$/g, "$");

  // 6. Best-effort: auto-wrap obvious unwrapped LaTeX expressions like
  //    \frac{1}{2} or \sqrt{5} that the model forgot to delimit. We only
  //    touch chunks that clearly contain LaTeX command tokens.
  out = out.replace(/(\\(?:frac|sqrt|sum|prod|int|lim|overline|underline|vec)\s*\{[^{}]*\}(?:\s*\{[^{}]*\})?)/g, (m) => {
    return renderInline(m);
  });

  return out;
};

const MathContent = ({ html, className }: MathContentProps) => {
  const safeHtml = useMemo(() => {
    const withMath = renderMath(html ?? "");
    return DOMPurify.sanitize(withMath, {
      ADD_TAGS: [
        // KaTeX MathML
        "math", "mrow", "mi", "mo", "mn", "msup", "msub", "msubsup", "mfrac", "msqrt", "mroot",
        "mtext", "annotation", "semantics", "mspace", "mstyle", "munder", "mover", "munderover",
        "mtable", "mtr", "mtd", "mpadded", "mphantom", "menclose",
        // Inline SVG charts/diagrams used by DI-LR caselets
        "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
        "text", "tspan", "defs", "marker", "use", "symbol", "title", "desc", "linearGradient",
        "radialGradient", "stop",
      ],
      ADD_ATTR: [
        "xmlns", "encoding", "mathvariant", "stretchy", "minsize", "maxsize",
        "displaystyle", "scriptlevel", "style", "class", "aria-hidden",
        "viewBox", "preserveAspectRatio", "fill", "stroke",
        "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
        "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "d", "points",
        "transform", "text-anchor", "font-size", "font-family", "font-weight",
        "offset", "stop-color", "stop-opacity", "opacity", "width", "height",
      ],
    });
  }, [html]);

  return (
    <div
      className={`math-content ${className ?? "text-sm leading-relaxed"}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default MathContent;
