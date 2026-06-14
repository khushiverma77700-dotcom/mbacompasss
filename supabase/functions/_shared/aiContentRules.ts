// Shared rules appended to every long-form AI content generator
// (blogs, college pages, college sections, institute pages, course pages, news, refresh).
// Enforces: no AI buzzwords, mandatory "About MBA Compass" section, "Summary" not "Quick Summary".

export const MBA_COMPASS_SECTION_RULES = `

# MANDATORY — "About MBA Compass" SECTION (NON-NEGOTIABLE)
Every long-form output MUST include a dedicated H2 section near the conclusion titled exactly "About MBA Compass" (or "How MBA Compass Helps You").
- Place it AFTER the FAQs (if any) and BEFORE the final Conclusion / CTA.
- Length: 120-180 words. Tone: educational and value-driven, NOT promotional. Mentor voice — no hype words like "best", "ultimate", "must-have", "unbeatable", "world-class".
- Cover, naturally and briefly, ALL three points:
  1. What MBA Compass is — an MBA discovery and decision platform for Indian aspirants (a B School Buzz product) that brings colleges, exams, coaching, mocks and AI tools into one place.
  2. How it helps MBA aspirants — shortlist the right colleges, analyse their profile, compare programmes, prep with full-length mocks, plan the prep timeline, and weigh fees vs ROI vs expected packages before committing.
  3. Why students benefit — a single, data-driven place to make the biggest MBA decisions (where to apply, how to prep, what to expect financially) instead of stitching info from 10 different sites.
- End the section with 2-3 contextual internal links chosen from: /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks — pick the ones most relevant to THIS topic.
- This section is REQUIRED on every blog, college page, exam page, institute page, course page, guide and resource article. NEVER skip it.

# BANNED AI BUZZWORDS — ZERO TOLERANCE
Never use any of these phrases anywhere in the output. Output containing them will be rejected:
"unlock", "delve", "delve into", "landscape", "navigate", "navigating", "furthermore", "moreover", "in today's fast-paced world", "in the realm of", "embark on a journey", "ever-evolving", "it's worth noting", "look no further", "stay tuned", "dive into", "diving deep", "unleash", "harness the power", "game-changer", "cutting-edge", "world-class", "robust", "leverage", "synergy", "paradigm", "seamless", "holistic", "ecosystem" (unless quoting), "in conclusion", "to sum up", "as we all know", "needless to say", "tapestry", "testament", "in essence", "at the end of the day", "when it comes to", "plays a pivotal role", "plays a crucial role", "in the world of", "a myriad of", "plethora", "first and foremost", "it is important to note", "it is worth mentioning", "in summary", "to conclude", "remember that", "rest assured", "elevate", "transformative", "groundbreaking", "revolutionary", "best-in-class", "state-of-the-art", "unparalleled", "second to none", "in the ever-changing world", "the journey of", "a treasure trove", "stands as a", "serves as a", "speaks volumes".
Write simple, direct, human English. Plain words. No marketing fluff.

# TERMINOLOGY (STRICT)
- NEVER write "Quick Summary", "Quick summary", "TL;DR" or "TLDR". The only allowed label is "Summary" — e.g. <p><strong>Summary:</strong> …</p> or <h2>Summary</h2>.
`;
