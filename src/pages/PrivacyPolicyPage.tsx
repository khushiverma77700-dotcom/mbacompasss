import PolicyLayout from "@/components/PolicyLayout";

const PrivacyPolicyPage = () => (
  <PolicyLayout
    title="Privacy Policy"
    description="How MBA Compass (Akaniya Ventures Private Limited) collects, uses, stores, and protects personal information."
    canonical="https://mbacompass.in/privacy-policy"
  >
    <p>
      This Privacy Policy explains how <strong>Akaniya Ventures Private Limited</strong>{" "}
      ("we", "us", "MBA Compass") collects, uses, stores, and shares personal information when you
      use <a href="https://mbacompass.in">mbacompass.in</a> and related services. It is published
      in accordance with the Digital Personal Data Protection Act, 2023 (India) and applicable
      rules.
    </p>

    <h2>1. Who we are</h2>
    <p>
      MBA Compass is a brand of Akaniya Ventures Private Limited, a company registered in
      Uttar Pradesh, India. For privacy queries, write to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a>.
    </p>

    <h2>2. Information we collect</h2>
    <ul>
      <li>
        <strong>Account information</strong> — name, email, mobile number, and password (hashed) at
        sign-up.
      </li>
      <li>
        <strong>Profile information you provide</strong> — graduation year, work experience, target
        exams, target colleges, mock-test scores, and similar inputs you give to our tools (Profile
        Analyzer, College Shortlister, ROI Calculator).
      </li>
      <li>
        <strong>Activity data</strong> — pages visited, searches, mock-test attempts, bookmarks, and
        coupon claims.
      </li>
      <li>
        <strong>Device &amp; log data</strong> — IP address, browser, device type, referring URL,
        and timestamps, used for security and analytics.
      </li>
      <li>
        <strong>Payment data</strong> — handled by our payment gateway (Razorpay). We do not store
        card or UPI credentials on our servers.
      </li>
      <li>
        <strong>Cookies</strong> — used for authentication, preferences, and aggregated analytics.
      </li>
    </ul>

    <h2>3. How we use your information</h2>
    <ul>
      <li>To create and operate your account.</li>
      <li>To personalise recommendations (colleges, courses, mocks).</li>
      <li>To process purchases and unlock access to paid products.</li>
      <li>To send transactional messages (OTP, receipts, course updates) and, with your consent, newsletters.</li>
      <li>To detect fraud, abuse, and security incidents.</li>
      <li>To improve our content, tools, and user experience.</li>
    </ul>

    <h2>4. Who we share data with</h2>
    <ul>
      <li>
        <strong>Listed institutes</strong> — only when you explicitly request a brochure, callback,
        or coupon from that institute. We share your name, email, and mobile for that purpose.
      </li>
      <li>
        <strong>Service providers</strong> — Supabase (database &amp; auth), Razorpay (payments),
        Cloudflare (CDN/security), Google (analytics, indexing), Resend (transactional email), OpenAI
        / Google AI (AI features). These providers process data on our instructions.
      </li>
      <li>
        <strong>Legal &amp; safety</strong> — where required by Indian law, court order, or to
        protect rights and safety.
      </li>
    </ul>
    <p>We do not sell your personal data.</p>

    <h2>5. Data retention</h2>
    <p>
      We retain account data while your account is active. Anonymised analytics and aggregate data
      may be retained longer. You can request deletion at any time (see Section 7).
    </p>

    <h2>6. Security</h2>
    <p>
      We use HTTPS, hashed passwords, role-based access control, and row-level database security to
      protect data. No system is perfectly secure; you remain responsible for keeping your account
      password confidential.
    </p>

    <h2>7. Your rights</h2>
    <ul>
      <li><strong>Access</strong> the personal data we hold about you.</li>
      <li><strong>Correct</strong> inaccurate data.</li>
      <li><strong>Delete</strong> your account and associated data.</li>
      <li><strong>Withdraw consent</strong> for marketing communications at any time.</li>
      <li><strong>Lodge a grievance</strong> with our Grievance Officer (see Section 9).</li>
    </ul>
    <p>
      Email <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> from your registered
      address. We respond within 30 days.
    </p>

    <h2>8. Children</h2>
    <p>
      Our services are intended for users aged 16 and above. We do not knowingly collect data from
      children younger than 16 without verifiable parental consent.
    </p>

    <h2>9. Grievance Officer</h2>
    <p>
      In accordance with Indian law, you may contact our Grievance Officer at{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> (Phone: +91 76681 29226) for
      any privacy-related concerns.
    </p>

    <h2>10. Changes to this policy</h2>
    <p>
      We may update this policy from time to time. Material changes will be notified on the site or
      by email at least seven days before they take effect.
    </p>
  </PolicyLayout>
);

export default PrivacyPolicyPage;
