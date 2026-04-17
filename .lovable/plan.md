
Goal: Make the MBA ROI report self-explanatory, visually richer, and easier to navigate.

Scope (file: `src/pages/MBARoiCalculatorPage.tsx`, plus `src/components/roi/NarrativeBlock.tsx`):

1. Sticky Tab Navigation
   - Wrap the report `TabsList` (and the TabHint banner) in a `sticky top-16 z-40` container with a blurred white background (`bg-white/85 backdrop-blur-md border-b`).
   - Apply on both the actual Report and the Sample Report showcase so users can switch tabs anytime without scrolling back up.
   - Ensure it sits below the global navbar (offset using existing navbar height ~64px).

2. "Why this matters" intro for every section
   - Add a small intro card at the top of each tab (Overview, Financial, Career, Risk, Roadmap, Colleges) with:
     - A one-line "Purpose" (what this tab shows)
     - 2–3 bullet "Why you should check this" points in plain student-friendly language
     - An icon + soft gradient background (blue/emerald/violet per tab)
   - Content is static, advisor-style copy (not AI generated) so it always renders cleanly. Examples:
     - Overview: "Your MBA at a glance — is it worth the money, time, and effort?"
     - Financial: "See exactly how much you spend, when you break even, and how much extra you earn over 10 years."
     - Career: "Understand the roles, salary jumps, and growth path you can expect after graduation."
     - Risk: "Know what could go wrong before you commit ₹20–40 lakhs."
     - Roadmap: "Your step-by-step action plan for the next 6–12 months."
     - Colleges: "Compare every shortlisted college on fees, salary, payback, and ROI score."

3. Richer chart UI
   - Upgrade `NarrativeBlock` chart variants and inline charts in the report:
     - Replace flat AreaCharts with gradient-filled areas (linearGradient defs), rounded corners, soft drop shadows, and animated entrance (`isAnimationActive`).
     - Add value labels on top of bars, custom rounded bar shapes, and gradient bar fills.
     - Donut/Pie: add center label (e.g. "ROI 78/100"), thicker stroke, color-coded legend chips.
     - Risk meter (RadialBar): add gradient track, animated needle, qualitative label ("Moderate Risk — manageable").
     - Add subtle grid (`strokeDasharray="3 3"`, low opacity) and branded tooltip (white card, shadow, primary accent border).
   - Use a consistent palette: primary blue `#3B82F6`, emerald `#10B981`, violet `#8B5CF6`, amber `#F59E0B` — no dark navy.

4. Plain-language rewrites
   - Replace AI prose headers with student-friendly titles: e.g. "Financial Deep-Dive" → "Will the money come back?", "Career Trajectory" → "Where will you be in 5 years?", "Risk Analysis" → "What could go wrong?".
   - Each `NarrativeBlock` gets a short subtitle under the title in conversational tone.
   - Keep AI narrative collapsed by default (already done) but auto-expand the Key Takeaways and add a "In simple words" 1-line summary above it.

5. Section dividers & polish
   - Add gradient section dividers between major blocks within a tab.
   - Cards: rounded-2xl, subtle border, shadow-sm, hover:shadow-lg transition.
   - Animate section entrance with framer-motion stagger (already used) — keep consistent.

Technical Notes
- No schema/edge function changes. Pure frontend.
- `sticky` requires no parent `overflow-hidden` — verify the report wrapper doesn't clip.
- Sticky offset: navbar is `h-16` → use `top-16`. On mobile, tabs become horizontally scrollable already.
- Reuse existing `recharts` — add `<defs><linearGradient>` per chart for gradient fills.
- Keep all copy aligned with the "smart MBA advisor" tone (per project memory).

Out of Scope
- No changes to landing page, sample report logic (only sticky + visual polish mirrored), or backend.
- No new dependencies.
