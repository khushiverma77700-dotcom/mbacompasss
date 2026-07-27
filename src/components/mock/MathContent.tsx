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
const LATEX_TOKEN_RE = /\\(?:frac|dfrac|tfrac|sqrt|binom|sum|prod|int|lim|cdot|times|div|leq|geq|neq|approx|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|left|right|begin|end|mathbb|mathrm|text|overline|underline|vec)\b/;
const BARE_COMMAND_RE = /\\(?:frac|dfrac|tfrac|sqrt|binom|sum|prod|int|lim|overline|underline|vec)\b/g;
const PLACEHOLDER_START = "\uE100MATH";
const PLACEHOLDER_END = "\uE101";
const MATH_SYMBOL_RE = /[=<>≤≥≈^_{}]|\\(?:frac|dfrac|tfrac|sqrt|binom|sum|prod|int|lim|cdot|times|div|leq|geq|neq|approx|infty)\b|√|[×÷]/;

const normalizeMathExpression = (expr: string): string =>
  expr
    .replace(/[−–—]/g, "-")
    .replace(/[×]/g, "\\times ")
    .replace(/[÷]/g, "\\div ")
    .replace(/[≤]/g, "\\leq ")
    .replace(/[≥]/g, "\\geq ")
    .replace(/[≈]/g, "\\approx ")
    .replace(/√\s*\(([^()]+)\)/g, "\\sqrt{$1}")
    .replace(/√\s*([A-Za-z0-9]+)/g, "\\sqrt{$1}")
    .trim();

const renderInline = (expr: string): string => {
  try {
    return katex.renderToString(normalizeMathExpression(expr), {
      displayMode: false,
      throwOnError: false,
      output: "html",
      strict: "ignore",
      trust: false,
    });
  } catch {
    return expr;
  }
};

const renderBlock = (expr: string): string => {
  try {
    return katex.renderToString(normalizeMathExpression(expr), {
      displayMode: true,
      throwOnError: false,
      output: "html",
      strict: "ignore",
      trust: false,
    });
  } catch {
    return expr;
  }
};

const makeStash = () => {
  const items: string[] = [];
  return {
    store(value: string) {
      const token = `${PLACEHOLDER_START}${items.length}${PLACEHOLDER_END}`;
      items.push(value);
      return token;
    },
    restore(value: string) {
      return value.replace(new RegExp(`${PLACEHOLDER_START}(\\d+)${PLACEHOLDER_END}`, "g"), (_m, idx) => items[Number(idx)] ?? "");
    },
  };
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

const readBalancedGroup = (text: string, start: number): number => {
  if (text[start] !== "{") return start;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) return i + 1;
  }
  return start;
};

const readOptionalScript = (text: string, start: number): number => {
  let i = start;
  while (/\s/.test(text[i] ?? "")) i += 1;
  while (text[i] === "_" || text[i] === "^") {
    i += 1;
    while (/\s/.test(text[i] ?? "")) i += 1;
    if (text[i] === "{") {
      const next = readBalancedGroup(text, i);
      if (next === i) return start;
      i = next;
    } else {
      while (/[A-Za-z0-9=+\-.,]/.test(text[i] ?? "")) i += 1;
    }
    while (/\s/.test(text[i] ?? "")) i += 1;
  }
  return i;
};

const readLatexCommandExpression = (text: string, start: number): number => {
  const command = text.slice(start).match(/^\\([A-Za-z]+)/)?.[1] ?? "";
  if (!command) return start;

  let i = start + command.length + 1;
  i = readOptionalScript(text, i);

  if (command === "sqrt" && text[i] === "[") {
    const close = text.indexOf("]", i + 1);
    if (close > i) i = close + 1;
  }

  const requiredGroups = command === "frac" || command === "dfrac" || command === "tfrac" || command === "binom" ? 2 : 1;
  let groupsRead = 0;
  while (groupsRead < requiredGroups) {
    while (/\s/.test(text[i] ?? "")) i += 1;
    if (text[i] !== "{") break;
    const next = readBalancedGroup(text, i);
    if (next === i) break;
    i = next;
    groupsRead += 1;
  }

  return groupsRead > 0 || command === "sum" || command === "prod" || command === "int" || command === "lim" ? i : start;
};

const renderBareLatexCommands = (text: string, store: (value: string) => string): string => {
  BARE_COMMAND_RE.lastIndex = 0;
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = BARE_COMMAND_RE.exec(text)) !== null) {
    const start = match.index;
    const end = readLatexCommandExpression(text, start);
    if (end <= start) continue;
    out += text.slice(last, start);
    out += store(renderInline(text.slice(start, end)));
    last = end;
    BARE_COMMAND_RE.lastIndex = end;
  }
  return out + text.slice(last);
};

const renderPlainEquations = (text: string, store: (value: string) => string): string => {
  let out = text;

  // Complete equation chunks: x^2 - 5x + k = 0, 2x + 3x = 5, S_n = 3n^2 + 2n.
  out = out.replace(
    /(^|[\s(:;])([A-Za-z0-9][A-Za-z0-9_{}^+\-*/().\s≤≥≈×÷]*\s*[=<>≤≥≈]\s*[A-Za-z0-9_{}^+\-*/().\s≤≥≈×÷]+?)(?=\s*(?:,|;|\.|:|\)|$))/g,
    (m, prefix, expr) => {
      const candidate = String(expr).trim();
      if (candidate.length < 3 || candidate.length > 120) return m;
      if (!/[=<>≤≥≈]/.test(candidate)) return m;
      const leftSide = candidate.split(/[=<>≤≥≈]/)[0]?.trim() ?? "";
      if (/^[A-Za-z]{2,}\s+[A-Za-z0-9]/.test(leftSide)) return m;
      return `${prefix}${store(renderInline(candidate))}`;
    },
  );

  // Short symbolic fragments after prose markers: "Probability = ...", "k = ...".
  out = out.replace(
    /(^|[\s(:;])((?:Probability|P|k|x|y|n|S_n|a_n|A_n)\s*=\s*(?:\\[A-Za-z]+\{[^\n.;]+|[A-Za-z0-9_{}^+\-*/().\s≤≥≈×÷√]+))(?=\s*(?:,|;|\.|:|\)|$))/g,
    (m, prefix, expr) => {
      const candidate = String(expr).trim();
      if (!MATH_SYMBOL_RE.test(candidate)) return m;
      return `${prefix}${store(renderInline(candidate))}`;
    },
  );

  // Common root notation in prose: √(144), √5.
  out = out.replace(
    /√\s*(?:\([^()]+\)|[A-Za-z0-9]+)/g,
    (m) => store(renderInline(m)),
  );

  // Bare powers/subscripts outside equations: n^2, x_{1}, a_n.
  out = out.replace(
    /(^|[^\\\w])([A-Za-z][A-Za-z0-9]?)(\^|_)(\{[^{}]+\}|[A-Za-z0-9]+)/g,
    (_m, prefix, base, op, exp) => `${prefix}${store(renderInline(`${base}${op}${exp}`))}`,
  );

  return out;
};

const transformTextOutsideTags = (html: string, transform: (text: string) => string): string => {
  const tagRe = /<[^>]*>/g;
  let out = "";
  let last = 0;
  let skipTag: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0];
    const text = html.slice(last, match.index);
    out += skipTag ? text : transform(text);
    out += tag;

    const closing = tag.match(/^<\s*\/\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase();
    const opening = tag.match(/^<\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase();
    if (closing && closing === skipTag) skipTag = null;
    if (!skipTag && opening && ["code", "pre", "script", "style", "svg", "math"].includes(opening) && !/^<\s*\//.test(tag)) {
      skipTag = opening;
    }
    last = match.index + tag.length;
  }

  const rest = html.slice(last);
  out += skipTag ? rest : transform(rest);
  return out;
};

const renderMath = (input: string): string => {
  if (!input) return "";

  // 0. Clean code fences / markdown noise BEFORE math parsing so $...$ inside
  //    a stripped ```html block is still picked up.
  let out = sanitizeArtifacts(input);

  const stash = makeStash();

  // Normalize: LLMs sometimes emit \\$ or \\(. Collapse double backslashes
  // that precede math delimiters into a single backslash so our regex matches.
  out = out.replace(/\\\\(\$|\(|\)|\[|\])/g, "\\$1");

  // 1. Block math: $$ ... $$
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => stash.store(renderBlock(String(expr).trim())));

  // 2. Block math: \[ ... \]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => stash.store(renderBlock(String(expr).trim())));

  // 3. Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr) => stash.store(renderInline(String(expr).trim())));

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
    return stash.store(renderInline(e));
  });

  // 5. Escaped dollar that wasn't part of math — unescape \$ to $
  out = out.replace(/\\\$/g, "$");

  // 6. Auto-render unwrapped math only in text nodes, never inside HTML tags
  //    or already-rendered KaTeX placeholders. Handles nested \frac/\binom.
  out = transformTextOutsideTags(out, (text) =>
    renderPlainEquations(
      renderBareLatexCommands(text, (value) => stash.store(value)),
      (value) => stash.store(value),
    ),
  );

  return stash.restore(out);
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
