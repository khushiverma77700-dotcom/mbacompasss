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

// Strip code fences, JSON wrappers, markdown noise, zero-width chars and
// other artefacts LLMs sometimes leak into stored question/option HTML.
const sanitizeArtifacts = (input: string): string => {
  if (!input) return "";
  let s = input;

  // Zero-width / BOM / non-printing whitespace
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Triple-backtick fences:  ```html ... ```   |   ```latex ... ```   |   ``` ... ```
  s = s.replace(/```(?:html|latex|tex|md|markdown|json|text)?\s*([\s\S]*?)```/gi, "$1");
  // Stray opening / closing fence
  s = s.replace(/```+/g, "");

  // Inline code  `foo`  → <code>foo</code>  (only when there's no HTML tag inside)
  s = s.replace(/`([^`\n<>]+)`/g, "<code>$1</code>");

  // Heading markers at start of line  (### Heading)
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Bold:  **text**  or  __text__   → <strong>text</strong>
  s = s.replace(/\*\*([^\*\n]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|\s)__([^_\n]+?)__(?=\s|$)/g, "$1<strong>$2</strong>");

  // Italic:  *text*  /  _text_  (single, not adjacent to word chars to avoid \_subscripts_)
  s = s.replace(/(^|[\s(])\*([^\*\n]+?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");

  // Markdown bullets at line start:  "* item" / "- item" / "• item"  → <li>item</li>
  // Only convert when the source has no <ul>/<ol>/<li> tag already.
  if (!/<\/?(?:ul|ol|li)\b/i.test(s)) {
    const bulletLine = /^[ \t]*(?:[-*•]|\d+\.)\s+(.+)$/gm;
    if (bulletLine.test(s)) {
      bulletLine.lastIndex = 0;
      const items: string[] = [];
      s = s.replace(bulletLine, (_m, body) => {
        items.push(`<li>${body.trim()}</li>`);
        return "\u0001LI\u0001";
      });
      // Group consecutive LI placeholders into a single <ul>
      s = s.replace(/(?:\u0001LI\u0001\s*)+/g, () => {
        const block = `<ul>${items.splice(0, items.length).join("")}</ul>`;
        return block;
      });
    }
  }

  // Plain text with newlines but no HTML → wrap line breaks
  if (!/<[a-z][\s\S]*>/i.test(s) && /\n/.test(s)) {
    s = s.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
    s = `<p>${s}</p>`;
  }

  return s.trim();
};

const renderMath = (input: string): string => {
  if (!input) return "";

  // 0. Clean code fences / markdown noise BEFORE math parsing so $...$ inside
  //    a stripped ```html block is still picked up.
  let out = sanitizeArtifacts(input);

  // Normalize: LLMs sometimes emit \\$ or \\(. Collapse double backslashes
  // that precede math delimiters into a single backslash so our regex matches.
  out = out.replace(/\\\\(\$|\(|\)|\[|\])/g, "\\$1");

  // 1. Block math: $$ ... $$
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => renderBlock(String(expr).trim()));

  // 2. Block math: \[ ... \]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => renderBlock(String(expr).trim()));

  // 3. Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr) => renderInline(String(expr).trim()));

  // 4. Inline math: $ ... $  (currency-aware + prose-aware)
  out = out.replace(/\$([^\$\n<>]+?)\$/g, (m, expr) => {
    const e = String(expr).trim();
    if (!e) return m;
    if (/^[\d,]+(?:\.\d+)?$/.test(e)) return m;
    if (/^[\d,.\s]+(?:USD|INR|EUR|GBP|Rs\.?)?$/i.test(e)) return m;
    // Prose-guard: if the inner chunk looks like an English sentence (no LaTeX
    // tokens + 2+ alphabetic words), it's almost certainly a pair of currency
    // $ signs wrapping prose like "$1 million ... profit of $2".
    const hasLatex = LATEX_TOKEN_RE.test(e) || /[\^_{}\\]/.test(e);
    if (!hasLatex) {
      const wordCount = (e.match(/\b[A-Za-z]{2,}\b/g) || []).length;
      if (wordCount >= 2) return m;
    }
    return renderInline(e);
  });

  // 5. Escaped dollar that wasn't part of math — unescape \$ to $
  out = out.replace(/\\\$/g, "$");

  // 6. Auto-wrap obvious unwrapped LaTeX commands like \frac{1}{2}, \sqrt{5},
  //    \sum_{i=1}^n, \overline{AB} that the model forgot to delimit.
  out = out.replace(
    /(\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|lim|overline|underline|vec|binom)\s*(?:_\{[^{}]*\})?\s*(?:\^\{[^{}]*\})?\s*\{[^{}]*\}(?:\s*\{[^{}]*\})?)/g,
    (m) => renderInline(m),
  );

  // 7. Bare superscripts / subscripts not already in math:  x^2, a_n, x^{n+1}
  //    Wrap only the token so surrounding text stays plain.
  out = out.replace(
    /(?<![\\\w])([A-Za-z0-9])(\^|_)(\{[^{}]+\}|[A-Za-z0-9]+)/g,
    (_m, base, op, exp) => renderInline(`${base}${op}${exp}`),
  );

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
