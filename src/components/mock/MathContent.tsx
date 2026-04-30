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
 * Supported delimiters:
 *   - $$ ... $$  (block)
 *   - \[ ... \]  (block)
 *   - $ ... $    (inline) — only when the $ does NOT look like currency
 *   - \( ... \)  (inline)
 *
 * Math is rendered via KaTeX. SVG / MathML / table tags survive sanitization
 * so DI-LR caselets that ship inline charts and tables render cleanly.
 */
const renderMath = (input: string): string => {
  if (!input) return "";

  // Block math: $$...$$
  let out = input.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    try {
      return katex.renderToString(String(expr).trim(), { displayMode: true, throwOnError: false, output: "html" });
    } catch {
      return _m;
    }
  });

  // Block math: \[ ... \]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => {
    try {
      return katex.renderToString(String(expr).trim(), { displayMode: true, throwOnError: false, output: "html" });
    } catch {
      return _m;
    }
  });

  // Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr) => {
    try {
      return katex.renderToString(String(expr).trim(), { displayMode: false, throwOnError: false, output: "html" });
    } catch {
      return _m;
    }
  });

  // Inline math: $ ... $ — skip currency-looking $123, $1,000.50, $ 45 etc.
  // Only match when the inside contains a math-y character (\, ^, _, =, /)
  // OR doesn't look like a plain decimal number.
  out = out.replace(/\$([^\$\n]+?)\$/g, (m, expr) => {
    const e = String(expr).trim();
    const looksLikeCurrency = /^[\s]*[\d,]+(?:\.\d+)?[\s]*$/.test(e);
    if (looksLikeCurrency) return m;
    try {
      return katex.renderToString(e, { displayMode: false, throwOnError: false, output: "html" });
    } catch {
      return m;
    }
  });

  return out;
};

const MathContent = ({ html, className }: MathContentProps) => {
  const safeHtml = useMemo(() => {
    const withMath = renderMath(html ?? "");
    return DOMPurify.sanitize(withMath, {
      ADD_TAGS: [
        // KaTeX MathML
        "math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mtext",
        "annotation", "semantics", "mspace", "mstyle", "munder", "mover", "munderover",
        // Inline SVG charts/diagrams used by DI-LR caselets
        "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
        "text", "tspan", "defs", "marker", "use", "symbol", "title", "desc", "linearGradient",
        "radialGradient", "stop",
      ],
      ADD_ATTR: [
        "xmlns", "encoding", "mathvariant", "stretchy", "minsize", "maxsize",
        "displaystyle", "style", "viewBox", "preserveAspectRatio", "fill", "stroke",
        "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
        "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "d", "points",
        "transform", "text-anchor", "font-size", "font-family", "font-weight",
        "offset", "stop-color", "stop-opacity", "opacity",
      ],
    });
  }, [html]);

  return (
    <div
      className={className ?? "prose prose-sm max-w-none"}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default MathContent;
