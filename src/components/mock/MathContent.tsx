import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "isomorphic-dompurify";

interface MathContentProps {
  html: string;
  className?: string;
}

/**
 * Renders rich HTML content with inline ($...$) and block ($$...$$) LaTeX math.
 * Math is rendered via KaTeX server-side-friendly renderToString. HTML is sanitized.
 */
const renderMath = (input: string): string => {
  if (!input) return "";
  // Block math first ($$...$$)
  let out = input.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false, output: "html" });
    } catch {
      return _m;
    }
  });
  // Inline math ($...$) — avoid matching across newlines or starting with whitespace
  out = out.replace(/\$([^\$\n]+?)\$/g, (_m, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false, output: "html" });
    } catch {
      return _m;
    }
  });
  return out;
};

const MathContent = ({ html, className }: MathContentProps) => {
  const safeHtml = useMemo(() => {
    const withMath = renderMath(html ?? "");
    // Allow KaTeX classes & MathML
    return DOMPurify.sanitize(withMath, {
      ADD_TAGS: ["math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mtext", "annotation", "semantics", "mspace", "mstyle", "munder", "mover", "munderover"],
      ADD_ATTR: ["xmlns", "encoding", "mathvariant", "stretchy", "minsize", "maxsize", "displaystyle", "style"],
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
