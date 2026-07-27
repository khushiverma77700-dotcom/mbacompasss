import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MathContent from "./MathContent";

/**
 * Validates KaTeX rendering across the surfaces that display AI-generated
 * mock content: question stems, option labels, and explanation bodies.
 *
 * We assert on the rendered DOM (presence of `.katex` nodes emitted by
 * KaTeX) rather than exact HTML to stay resilient to KaTeX version bumps.
 */

function renderMath(html: string) {
  const { container } = render(<MathContent html={html} />);
  return container;
}

function katexNodes(container: HTMLElement) {
  return container.querySelectorAll(".katex");
}

describe("MathContent — KaTeX rendering", () => {
  describe("delimited math", () => {
    it("renders inline math wrapped in $...$", () => {
      const c = renderMath("<p>Solve $x^2 + 2x + 1 = 0$ for x.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders block math wrapped in $$...$$", () => {
      const c = renderMath("$$\\frac{a}{b} = c$$");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders \\( ... \\) inline delimiters", () => {
      const c = renderMath("<p>Given \\(\\sqrt{144} = 12\\), continue.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders \\[ ... \\] block delimiters", () => {
      const c = renderMath("\\[\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\]");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });
  });

  describe("bare LaTeX auto-promotion", () => {
    it("renders unwrapped \\frac{a}{b}", () => {
      const c = renderMath("<p>Probability = \\frac{1}{6} approximately.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders unwrapped \\sqrt{n}", () => {
      const c = renderMath("<p>The value is \\sqrt{49} + 1.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders unwrapped \\binom{n}{k}", () => {
      const c = renderMath("<p>Count = \\binom{5}{2} ways.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });
  });

  describe("plain-text equations, roots, powers", () => {
    it("renders bare equations like x^2 - 5x + 6 = 0", () => {
      const c = renderMath("<p>Solve x^2 - 5x + 6 = 0 for x.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders unicode root notation √(144)", () => {
      const c = renderMath("<p>Compute √(144) directly.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("renders bare powers a^n and subscripts S_n", () => {
      const c = renderMath("<p>The sequence S_n and term a_n grow.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });
  });

  describe("question, options, explanation surfaces", () => {
    it("renders math inside a question stem", () => {
      const c = renderMath(
        "<p>If $2x + 3 = 11$, what is the value of $x$?</p>",
      );
      expect(katexNodes(c).length).toBeGreaterThanOrEqual(2);
    });

    it("renders math inside option labels", () => {
      const c = renderMath(
        '<ul><li>$\\frac{1}{2}$</li><li>$\\sqrt{2}$</li><li>$x^3$</li><li>$2^{n}$</li></ul>',
      );
      expect(katexNodes(c).length).toBeGreaterThanOrEqual(4);
    });

    it("renders math inside a multi-line explanation", () => {
      const c = renderMath(
        "<p>Step 1: $a^2 + b^2 = c^2$.</p>" +
          "<p>Step 2: therefore \\(c = \\sqrt{a^2 + b^2}\\).</p>" +
          "<p>Step 3: $$\\frac{c}{a} = \\sec\\theta$$</p>",
      );
      expect(katexNodes(c).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("robustness", () => {
    it("does not treat currency $100 as math", () => {
      const c = renderMath("<p>The fee is $100 per user.</p>");
      expect(katexNodes(c).length).toBe(0);
    });

    it("handles double-escaped delimiters \\\\( ... \\\\)", () => {
      const c = renderMath("<p>Value \\\\(x^2\\\\) here.</p>");
      expect(katexNodes(c).length).toBeGreaterThan(0);
    });

    it("does not throw on empty or malformed input", () => {
      expect(() => renderMath("")).not.toThrow();
      expect(() => renderMath("<p>$ unclosed</p>")).not.toThrow();
    });
  });
});
