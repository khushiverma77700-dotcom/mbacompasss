import PolicyLayout from "@/components/PolicyLayout";

const ReviewPolicyPage = () => (
  <PolicyLayout
    title="Review Policy"
    description="How MBA Compass collects, moderates, and publishes reviews and ratings for B-schools, coaching institutes, and courses."
    canonical="https://mbacompass.in/review-policy"
  >
    <p>
      User reviews on MBA Compass help future aspirants understand what life inside a B-school or
      coaching institute is really like. This Review Policy explains how reviews are collected,
      verified, displayed, and moderated.
    </p>

    <h2>1. Who can post a review</h2>
    <p>
      Anyone with a real, lived experience of the institute, programme, course, or coaching they
      are reviewing — current students, alumni, faculty, parents, or paid candidates. Reviews from
      employees of the listed institute about their own institute are flagged as such.
    </p>

    <h2>2. What we require</h2>
    <ul>
      <li>A verified email address and, for most categories, a verified mobile number (OTP).</li>
      <li>A rating on a 1–5 scale across the relevant criteria (e.g. faculty, infrastructure, placements, value-for-money).</li>
      <li>A written review of at least 80 characters describing the experience.</li>
      <li>The batch year and programme, where applicable.</li>
    </ul>

    <h2>3. What we never publish</h2>
    <ul>
      <li>Reviews containing personally identifying information about third parties (other students, faculty by name).</li>
      <li>Defamatory claims that cannot be evidenced.</li>
      <li>Hate speech, casteist, communal, sexist, or harassing content.</li>
      <li>Reviews that appear to be paid for, coordinated, or written by competitor brands.</li>
      <li>Spam, promotional content, or links to unrelated services.</li>
    </ul>

    <h2>4. Moderation</h2>
    <p>
      Every submitted review enters a moderation queue. We screen for the rules above, contact the
      reviewer if clarification is needed, and publish or reject within a reasonable window. We do
      not edit the substance of a published review — only formatting, typos, and redaction of PII.
    </p>

    <h2>5. Institute right-of-reply</h2>
    <p>
      Institutes and coaching brands can respond publicly to any review on their listing. They can
      also flag a review for re-moderation by writing to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a>. A flagged review is
      re-examined by our team; it is not automatically taken down.
    </p>

    <h2>6. Removing your own review</h2>
    <p>
      You can request removal of any review you wrote by emailing us from the address used to
      submit it. We honour removal requests within seven working days.
    </p>

    <h2>7. How ratings are calculated</h2>
    <p>
      A listing's aggregate rating is the simple average of all approved user ratings. We do not
      weight by recency, sentiment, or paid status. Listings with fewer than five reviews show the
      individual scores but no aggregate, to avoid misleading small-sample averages.
    </p>

    <h2>8. Conflict of interest</h2>
    <p>
      MBA Compass team members do not post reviews on listings on the platform. Paid placements
      (sponsored listings, featured brands) are visually labelled and have <em>no influence</em> on
      user reviews or aggregate ratings.
    </p>
  </PolicyLayout>
);

export default ReviewPolicyPage;
