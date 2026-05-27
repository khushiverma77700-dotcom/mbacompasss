// Small KaTeX wrapper that lazy-loads only when rendered.
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function normalizeDisplayMath(value?: string | null) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u0008/g, "\\b")
    .replace(/\u0009/g, "\\t")
    .replace(/\u000c/g, "\\f")
    .replace(/^\s*(?:\\\(|\\\[|\$\$?|`)+/, "")
    .replace(/(?:\\\)|\\\]|\$\$?|`)+\s*$/, "")
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

export function MathExpression({ tex, plain, className }: { tex?: string | null; plain?: string | null; className?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);
    if (!tex) { setFailed(true); return; }
    (async () => {
      try {
        const katex = await import("katex");
        if (!document.getElementById("katex-css")) {
          const link = document.createElement("link");
          link.id = "katex-css";
          link.rel = "stylesheet";
          link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
          document.head.appendChild(link);
        }
        const rendered = katex.default.renderToString(normalizeDisplayMath(tex), {
          throwOnError: false,
          displayMode: true,
        });
        if (!cancelled) setHtml(rendered);
      } catch {
        if (!cancelled) { setHtml(null); setFailed(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [tex]);

  const fallbackText = plain || tex || "";

  if (html && !failed) {
    return (
      <div
        className={cn("max-w-full overflow-x-auto overflow-y-hidden", className)}
        role="math"
        aria-label={fallbackText || "formula"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <code
      role="math"
      aria-label={fallbackText || "formula"}
      className={cn(
        "block max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900/40 px-3 py-2 font-mono text-sm leading-relaxed text-sky-100 sm:text-base",
        className,
      )}
    >
      {fallbackText}
    </code>
  );
}
