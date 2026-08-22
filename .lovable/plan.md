# /contact → Free MBA Guidance & Support Hub

Rebuild `/contact` as a student-first "Free MBA Guidance" landing page: one strong offer, one lead form above the fold, many CTAs pointing at it, and a WhatsApp-group success popup. Same URL, same header/footer, same brand system (white/light + existing blue tokens, no dark UI, no emojis).

## Page structure (top to bottom)

1. Hero (split, form on the right, above the fold on desktop)
   - H1: Get Free MBA Guidance & Mentorship
   - Sub: CAT strategy, profile review, college selection, resume review, admissions, placements.
   - Badges: 100% FREE FOR STUDENTS · Available for the next one month · No consultation fee
   - CTAs: Get My Free Guidance (scrolls to form) + Contact MBA Compass (existing contact details block)
2. What Can We Help You With? — 13 cards (Profile Review, Resume Review, Unbiased College Reviews, CAT Planner, CAT Strategies, CAT & OMET Mentorship, College Shortlisting, Admission Mentorship, Placement Report Guidance, Internship Guidance, MBA Career Guidance, General MBA Help). Each card CTA prefills the form's "need help with" selection and scrolls to it.
3. Yes, All of This Is FREE — checklist panel of all free services + "No fee / no hidden charges / no obligation".
4. Profile & Resume Review — dedicated two-column section with what students learn from each review. CTA: Get My Free Review.
5. Unbiased College Guidance — "Don't choose a college just because it looks good on paper"; factor chips (Fees, Placements, ROI, Roles, Recruiters, Specialisation, Location, Outcomes). Wording stays "student-first and information-focused". CTA: Get Free College Guidance.
6. Free CAT Planner — Study → Practice → Mocks → Analysis → Revision → Exam Strategy flow, positioned as guidance (no percentile promises). CTA: Get My Free CAT Planner.
7. Free MBA Mentorship journey — CAT Prep → Profile Building → Shortlisting → Applications → Interviews → Admission Decisions → Career Planning. CTA: Talk To Us For Free.
8. One Place. Multiple MBA Questions. — question chips/cards, CTA: Get Free MBA Guidance.
9. Who Can Reach Out + How It Works (3 numbered steps).
10. FAQ accordion (5 questions from the brief) using the existing accordion component.
11. Existing contact info (email / phone / address from site settings) kept, plus final CTA section: "Your MBA Questions Deserve Better Answers."
12. Sticky bottom CTA on mobile/tablet (safe-area padding, hidden while the form is in view); desktop keeps in-section CTAs.

## Form

Fields: Full Name, Email, WhatsApp/Mobile (10 digits), Graduation Year, Entrance Exam (CAT/XAT/SNAP/NMAT/CMAT/Other), Score/Percentile, Work Experience, Preferred Specialisation, "What do you need help with?" (multi-select of the 13 categories), Additional Query. Only Name, Email, Mobile and at least one help category are required; the rest optional so the form stays short.

Validation with zod + inline messages, real labels (not placeholder-only), loading state, double-submit guard, error toast on failure.

On success: premium modal — "Hi, Thank You for Submitting!" + "Our team will reach out to you shortly." + primary button **Join Our WhatsApp Group** (opens https://chat.whatsapp.com/Lig0RgN5CjOBL9HaaqXMTe?mode=gi_t in a new tab) + "Maybe Later" / close.

## Technical notes

- Rewrite `src/pages/ContactPage.tsx`; extract sections into `src/components/contact/*` (HeroWithForm, HelpCategoriesSection, FreeHighlightSection, ReviewSpotlightSection, CollegeGuidanceSection, CatPlannerSection, MentorshipJourneySection, QuestionsSection, HowItWorksSection, GuidanceFAQ, StickyGuidanceCTA, GuidanceSuccessDialog). No new libraries — existing shadcn UI, lucide icons, framer-motion (already a dependency) with `prefers-reduced-motion` respected.
- Backend: the current form inserts into `inquiries`, which only has name/email/phone/message/type — not enough for the new fields. Add a migration creating `public.guidance_requests` (name, email, phone, graduation_year, exam, score, work_experience, specialisation, help_topics text[], query, source, status, created_at) with GRANT INSERT to `anon` + `authenticated`, GRANT ALL to `service_role`, RLS enabled: insert-only policy for public, select/update restricted to admins via `has_role(auth.uid(),'admin')`. Existing `inquiries` flow and Admin Inquiries page stay untouched.
- Admin visibility: new page `/admin/guidance-requests` listing submissions with filters (help topic, date) and CSV export, added to the existing admin nav.
- WhatsApp URL lives in one exported constant `WHATSAPP_GROUP_URL` in `src/lib/whatsapp.ts`.
- Header: add a compact "Free MBA Guidance" link to `/contact#guidance-form` in `Navbar.tsx` (desktop + mobile) without restructuring the nav.
- SEO: keep the URL and canonical, single H1, update title/description/keywords for free MBA guidance, and add `Service` + `FAQPage` JSON-LD (FAQ schema exists only on the homepage, so no duplicate).
- Responsive QA at 320/360/375/390/414/768/820/1024/1280/1440/1920 via Playwright screenshots: no horizontal scroll, no card overflow, no sticky-CTA overlap, popup fits small screens, 44px touch targets.

## Out of scope

No changes to other pages, the global design system, or existing inquiry/lead pipelines.
