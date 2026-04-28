// Shared sanitizer for question + option HTML across all mock categories.
// Strips embedded "Q1.", "Question 1:", "Set 1:", "(A)", "A.", "1)" etc. so the
// UI can render question number, set number and option labels as static elements.

const QUESTION_PREFIX_PATTERNS: RegExp[] = [
  // "Q1.", "Q.1)", "Q 12 :"
  /^\s*Q\.?\s*\d+\s*[.\):\-]?\s*/i,
  // "Question 1:", "Question:" (with optional number)
  /^\s*Question\s*\d*\s*[.\):\-]?\s*/i,
  // Stray "Set 1:" / "Set 2 -" prefix when it leaks outside <div class="passage">
  /^\s*Set\s*\d+\s*[.\):\-]?\s*/i,
  // Bare leading numeric: "1.", "12)", "(3)"
  /^\s*\(?\d+\)?\s*[.\):\-]\s*/,
];

const OPTION_PREFIX_PATTERNS: RegExp[] = [
  // "A)", "(A)", "A.", "a -", "1)", "(1)"
  /^\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]\s*/,
];

function stripWithinFirstTextNode(html: string, patterns: RegExp[]): string {
  if (!html) return html;
  // Find the first run of plain text (skipping any leading tag like <p> or <div>).
  // Strip prefixes from that run repeatedly until none match.
  return html.replace(/^(\s*(?:<[^>]+>\s*)*)([\s\S]*?)(<|$)/, (_m, lead, body, tail) => {
    let next = body;
    let changed = true;
    let safety = 5;
    while (changed && safety-- > 0) {
      changed = false;
      for (const re of patterns) {
        const replaced = next.replace(re, "");
        if (replaced !== next) {
          next = replaced;
          changed = true;
        }
      }
    }
    return lead + next + tail;
  });
}

export function stripQuestionPrefix(html: string | null | undefined): string {
  if (!html) return html ?? "";
  return stripWithinFirstTextNode(html, QUESTION_PREFIX_PATTERNS);
}

export function stripOptionPrefix(html: string | null | undefined): string {
  if (!html) return html ?? "";
  return stripWithinFirstTextNode(html, OPTION_PREFIX_PATTERNS);
}
