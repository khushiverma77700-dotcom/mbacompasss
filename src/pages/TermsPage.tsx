import PolicyLayout from "@/components/PolicyLayout";

const faqs = [
  { q: "Who owns and operates MBA Compass?", a: "MBA Compass is a brand of Akaniya Ventures Private Limited, a company registered in Uttar Pradesh, India. The Terms of Use are governed by Indian law with exclusive jurisdiction in Uttar Pradesh." },
  { q: "What is the refund policy for MBA Compass paid products?", a: "Mock tests, bundles, and MBA Compass courses are delivered digitally and consumed on access, so all purchases are final and non-refundable unless otherwise stated on the product page. If a technical issue blocks access, email suyash@bschoolbuzz.in within seven days of purchase." },
  { q: "Can I share my MBA Compass account with others?", a: "No. Accounts are personal and non-transferable. Sharing credentials or accessing the platform through another person's account is a breach of these Terms and may result in suspension." },
  { q: "Can I republish MBA Compass content on another site?", a: "Substantial copying or republishing requires written permission. Short, properly-attributed quotations with a link back to the source page are allowed under fair use." },
  { q: "Where can I read the full Terms of Use?", a: "The full Terms of Use are published on this page (/terms). Material changes are notified on the site or by email at least seven days before they take effect." },
];

const TermsPage = () => (
  <PolicyLayout
    title="Terms of Use"
    description="The terms that govern your use of MBA Compass, operated by Akaniya Ventures Private Limited."
    canonical="https://mbacompass.in/terms"
    faqs={faqs}
  >
    <p>
      These Terms of Use ("Terms") govern your access to and use of{" "}
      <a href="https://mbacompass.in">mbacompass.in</a>, its sub-domains, mobile experience, and
      related services (together, the "Platform"), operated by{" "}
      <strong>Akaniya Ventures Private Limited</strong> ("MBA Compass", "we", "us"), a company
      registered in Uttar Pradesh, India. By using the Platform you agree to these Terms.
    </p>

    <h2>1. Eligibility</h2>
    <p>
      You must be at least 16 years old and capable of entering a contract under Indian law to use
      the Platform. By creating an account you confirm that the information you provide is true.
    </p>

    <h2>2. Your account</h2>
    <ul>
      <li>You are responsible for keeping your credentials confidential.</li>
      <li>You are responsible for all activity that happens under your account.</li>
      <li>You may not create more than one account or share your account with others.</li>
    </ul>

    <h2>3. Acceptable use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Scrape, copy, or republish substantial portions of the Platform without written permission.</li>
      <li>Submit false reviews, ratings, or test scores.</li>
      <li>Upload malware, attempt to break security, or probe our systems without authorisation.</li>
      <li>Use the Platform to send spam, phishing, or unsolicited promotional messages.</li>
      <li>Use the Platform in violation of Indian law.</li>
    </ul>

    <h2>4. Editorial content</h2>
    <p>
      Articles, rankings, and recommendations on MBA Compass are informational and do not
      constitute admissions advice, legal advice, or financial advice. Always verify time-sensitive
      details (dates, fees, eligibility) on the official institute or exam body website before
      acting. See our <a href="/editorial-policy">Editorial Policy</a> and{" "}
      <a href="/fact-check-policy">Fact-Check Policy</a>.
    </p>

    <h2>5. User-generated content</h2>
    <p>
      You retain ownership of reviews, comments, and other content you submit. By posting, you
      grant MBA Compass a worldwide, royalty-free licence to display, reproduce, translate, and
      promote that content on the Platform. You confirm the content is your own and does not
      infringe anyone else's rights. See our <a href="/review-policy">Review Policy</a>.
    </p>

    <h2>6. Paid products</h2>
    <ul>
      <li>Mock tests, bundles, and MBA Compass courses are sold on a non-transferable basis.</li>
      <li>Prices are listed in Indian Rupees and include applicable taxes unless stated otherwise.</li>
      <li>Payments are processed by Razorpay.</li>
      <li>
        Access to a purchased product is granted to the registered account that completed payment
        and is non-transferable.
      </li>
    </ul>

    <h2>7. Refunds &amp; cancellations</h2>
    <p>
      Because mock tests, course videos, and AI-generated reports are delivered digitally and
      consumed on access, all purchases are <strong>final and non-refundable</strong> unless
      otherwise stated on the product page. If you experience a technical issue that prevented
      access to a purchased product, write to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> within seven days of
      purchase and we will investigate.
    </p>

    <h2>8. Listings &amp; sponsored placements</h2>
    <p>
      Institutes and coaching brands may purchase featured listings or sponsored placements. Such
      placements are visually labelled and have <em>no influence</em> on editorial articles,
      rankings, or user reviews.
    </p>

    <h2>9. Intellectual property</h2>
    <p>
      The Platform's name, logo, design, original articles, tools, and codebase are owned by
      Akaniya Ventures Private Limited and protected by Indian and international IP law. You may
      not use them without our written permission.
    </p>

    <h2>10. Disclaimer</h2>
    <p>
      The Platform is provided "as is". We do not guarantee admission outcomes, exam scores,
      placement results, or career outcomes. Rankings, comparisons, and recommendations are
      opinion-based aids, not guarantees.
    </p>

    <h2>11. Limitation of liability</h2>
    <p>
      To the maximum extent permitted by law, our total liability arising out of or related to
      these Terms or the Platform is limited to the amount you paid to MBA Compass in the twelve
      months preceding the claim, or ₹5,000, whichever is higher.
    </p>

    <h2>12. Termination</h2>
    <p>
      We may suspend or terminate your access if you breach these Terms or use the Platform in a
      way that harms other users or our systems.
    </p>

    <h2>13. Governing law &amp; jurisdiction</h2>
    <p>
      These Terms are governed by the laws of India. Courts at Uttar Pradesh, India have exclusive
      jurisdiction over any disputes arising under or in connection with these Terms.
    </p>

    <h2>14. Contact</h2>
    <p>
      For any question about these Terms, write to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> or call +91 76681 29226.
    </p>
  </PolicyLayout>
);

export default TermsPage;
