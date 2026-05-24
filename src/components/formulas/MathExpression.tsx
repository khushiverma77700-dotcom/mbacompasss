// Small KaTeX wrapper that lazy-loads only when rendered.
import { useEffect, useState } from "react";

function normalizeDisplayMath(value?: string | null) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^\s*(?:\\\(|\\\[|\$\$?|`)+/, "")
    .replace(/(?:\\\)|\\\]|\$\$?|`)+\s*$/, "")
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

  useEffect(() => {
    let cancelled = false;
    if (!tex) { setHtml(null); return; }
    (async () => {
      try {
        const katex = await import("katex");
        // CSS is light enough to inline once
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
        if (!cancelled) setHtml(null);
      }
    })();
    return () => { cancelled = true; };
  }, [tex]);

  if (html) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <code className={className ?? "block rounded-lg bg-slate-900/95 px-4 py-3 font-mono text-base text-sky-100"}>
      {plain || tex || ""}
    </code>
  );
}
