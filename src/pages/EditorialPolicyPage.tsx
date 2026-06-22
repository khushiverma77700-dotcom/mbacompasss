import PolicyLayout from "@/components/PolicyLayout";

const EditorialPolicyPage = () => (
  <PolicyLayout
    title="Editorial Policy"
    description="How the MBA Compass editorial team researches, writes, reviews, and publishes content for Indian MBA aspirants."
    canonical="https://mbacompass.in/editorial-policy"
  >
    <p>
      MBA Compass (operated by <strong>Akaniya Ventures Private Limited</strong>) publishes
      research-led content on MBA admissions, entrance exams (CAT, XAT, NMAT, SNAP, GMAT, CMAT, MAT,
      IIFT), B-school rankings, placements, fees, coaching institutes, and career outcomes. This
      Editorial Policy explains the principles that guide everything we publish.
    </p>

    <h2>1. Our editorial mission</h2>
    <p>
      We exist to help Indian MBA aspirants make informed, evidence-based decisions about where to
      study, how to prepare, and what to expect after graduation. We are independent of any single
      institute, coaching brand, or admissions consultancy.
    </p>

    <h2>2. Sourcing and research standards</h2>
    <ul>
      <li>
        We prioritise <strong>primary sources</strong> — official institute websites, NIRF reports,
        IIM placement reports, exam conducting body notifications (IIMs, XLRI, NMIMS, SIU, IIFT,
        NTA), AICTE/UGC notices, and verifiable statements from institute spokespersons.
      </li>
      <li>
        Every numerical claim (cut-off, fee, package, batch size, GD/PI weight) is linked to or
        attributed to its source within the article wherever possible.
      </li>
      <li>
        Reader-contributed data (reviews, score reports, selection calls) is labelled as such and
        is never presented as official institute data.
      </li>
    </ul>

    <h2>3. Editorial independence</h2>
    <p>
      MBA Compass does not accept payment, gifts, hospitality, or any other consideration in
      exchange for editorial coverage, favourable ratings, or improved rankings. Listings, paid
      promotions, sponsored content, and advertisements are clearly labelled and visually separated
      from editorial articles.
    </p>

    <h2>4. Who writes for us</h2>
    <p>
      Content is created and reviewed by the <strong>MBA Compass Editorial Team</strong> — a group
      of researchers and former MBA aspirants who track the Indian B-school ecosystem full-time.
      Author and reviewer credentials are listed on each article and on individual{" "}
      <a href="/authors">author profile pages</a>.
    </p>

    <h2>5. Use of AI assistance</h2>
    <p>
      We use AI tools to assist with research summarisation, drafting outlines, and quality checks.
      <strong> No article is published without human editorial review.</strong> A human editor is
      responsible for the accuracy, tone, and final wording of every published page.
    </p>

    <h2>6. Updates and freshness</h2>
    <p>
      Exam dates, cut-offs, fees, and placement data change every cycle. We refresh time-sensitive
      pages at least once per admission cycle and add a <em>"Last updated"</em> date to every
      article. Outdated data is corrected, not silently deleted.
    </p>

    <h2>7. Reader feedback &amp; corrections</h2>
    <p>
      If you believe something we published is inaccurate, write to{" "}
      <a href="mailto:suyash@bschoolbuzz.in">suyash@bschoolbuzz.in</a> with a link to the page and
      your source. See our <a href="/fact-check-policy">Fact-Check &amp; Corrections Policy</a> for
      how we handle requests.
    </p>

    <h2>8. Diversity &amp; representation</h2>
    <p>
      We cover B-schools across tiers, regions, languages, and specialisations — not just the top
      IIMs. Our writing avoids gendered, casteist, or regionally biased language.
    </p>
  </PolicyLayout>
);

export default EditorialPolicyPage;
