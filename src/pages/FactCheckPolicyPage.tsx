import PolicyLayout from "@/components/PolicyLayout";

const faqs = [
  { q: "How does MBA Compass verify cut-offs, fees, and exam dates?", a: "Numerical and date-based claims are cross-checked against at least one primary source — the institute's official website, an official placement report, an exam conducting body notification, or a government dataset (NIRF, AICTE) — before publication, and re-verified at every refresh." },
  { q: "How does MBA Compass handle corrections?", a: "Minor edits (typos, formatting) are silent. Material corrections (wrong number, date, eligibility, or quote) are fixed in-line and tagged with a 'Correction' note describing what changed and when. Significant errors trigger social-channel updates and direct user notification where appropriate." },
  { q: "How long does it take to fix a reported error?", a: "We acknowledge every error report within two working days. Verified corrections are typically published within seven working days, depending on the severity and the source verification needed." },
  { q: "Does MBA Compass publish raw AI-generated content?", a: "No. AI tools assist with research and drafting outlines, but every published page passes through a human editor who is accountable for the accuracy of every factual claim." },
  { q: "How do I report inaccurate content?", a: "Email suyash@bschoolbuzz.in with the page URL, the exact statement you believe is incorrect, and your source (link, screenshot, or document) for the correct information." },
];

const FactCheckPolicyPage = () => (
  <PolicyLayout
    title="Fact-Check & Corrections Policy"
    description="How MBA Compass verifies claims before publishing and how we issue corrections when we get something wrong."
    canonical="https://mbacompass.in/fact-check-policy"
    faqs={faqs}
  >
    <p>
      MBA admissions decisions cost lakhs of rupees and shape entire careers. Getting a number,
      cut-off, or eligibility criterion wrong has real consequences. This policy explains how MBA
      Compass verifies facts before publication and how we correct errors after the fact.
    </p>

    <h2>1. Pre-publication fact checks</h2>
    <ul>
      <li>
        Numerical claims (cut-offs, fees, batch size, placement averages) are cross-checked against
        at least one primary source — the institute's official website, an official placement
        report, an exam conducting body's notification, or a verifiable government dataset (NIRF,
        AICTE).
      </li>
      <li>
        Dates (exam, application, result, GD-PI) are confirmed against the most recent official
        notification at the time of publication and are re-verified at every refresh.
      </li>
      <li>
        Quotes attributed to a person or institute are confirmed against the original source —
        press release, transcript, or written statement.
      </li>
      <li>
        Reader-contributed data is labelled as such and never represented as official institute
        data.
      </li>
    </ul>

    <h2>2. Sources we do not rely on alone</h2>
    <ul>
      <li>Anonymous social-media posts.</li>
      <li>Unverified WhatsApp / Telegram forwards.</li>
      <li>Single-user reviews (treated as opinion, not fact).</li>
      <li>AI-generated text without a verifiable upstream source.</li>
    </ul>

    <h2>3. How to report an error</h2>
    <p>
      Email <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> with:
    </p>
    <ul>
      <li>The URL of the page.</li>
      <li>The exact statement you believe is incorrect.</li>
      <li>Your source for the correct information (link, screenshot, or document).</li>
    </ul>
    <p>We acknowledge receipt within two working days.</p>

    <h2>4. How corrections are made</h2>
    <ul>
      <li>
        <strong>Minor edits</strong> (typos, formatting, broken links) are made silently.
      </li>
      <li>
        <strong>Material corrections</strong> (a wrong number, date, eligibility criterion, or
        quote) are made in-line, and an explicit <em>"Correction"</em> note is added at the top of
        the page describing what was changed and when.
      </li>
      <li>
        <strong>Significant errors</strong> that may have misled readers (for example a wrong
        cut-off during an active admission cycle) trigger an additional update on our social
        channels and, where appropriate, direct notification to users who interacted with the
        page.
      </li>
    </ul>

    <h2>5. Takedown requests</h2>
    <p>
      If an institute, individual, or organisation believes content about them is defamatory,
      inaccurate, or violates a legal right, they can write to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a>. We respond within seven
      working days with our findings.
    </p>

    <h2>6. AI-generated content</h2>
    <p>
      We use AI tools to assist with research and drafting. Every published page passes through a
      human editor who is accountable for the accuracy of every factual claim. We do not publish
      raw AI output as editorial content.
    </p>
  </PolicyLayout>
);

export default FactCheckPolicyPage;
